import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: (...args: unknown[]) => sendMock(...args) };
  },
}));

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('MAIL_FROM', 'METY <onboarding@resend.dev>');
  });

  it('submits verification email via Resend on success', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    const { sendVerificationEmail } = await import('../../services/mailer.js');
    await sendVerificationEmail('owner@example.com', 'https://app.test/verify?t=abc');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'METY <onboarding@resend.dev>',
        to: 'owner@example.com',
        subject: 'Verify your METY account',
        html: expect.stringContaining('https://app.test/verify?t=abc'),
        text: expect.stringContaining('https://app.test/verify?t=abc'),
      }),
    );
  });

  it('throws and logs when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('JWT_SECRET', '01234567890123456789012345678901');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM', 'METY <onboarding@resend.dev>');

    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendVerificationEmail } = await import('../../services/mailer.js');
    await expect(sendVerificationEmail('a@b.com', 'https://x')).rejects.toThrow(/RESEND_API_KEY/);

    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(payload.event).toBe('mail_send_failed');
    expect(payload.recipient).toBe('a@b.com');

    logSpy.mockRestore();
  });

  it('throws when Resend returns an error', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Invalid to address', statusCode: 422, name: 'validation_error' as const },
    });

    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendVerificationEmail } = await import('../../services/mailer.js');
    await expect(sendVerificationEmail('bad@x.com', 'https://x')).rejects.toThrow(/Resend rejected/);

    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(payload.event).toBe('mail_send_failed');
    expect(payload.recipient).toBe('bad@x.com');
    expect(payload.providerMessage).toBe('Invalid to address');

    logSpy.mockRestore();
  });
});
