import { Resend } from 'resend';
import config from '../config/config.js';

const VERIFY_SUBJECT = 'Verify your METY account';

function verificationHtml(verifyUrl: string): string {
  return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap');
      </style>
      <div style="margin:0;padding:28px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;line-height:1.6;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:30px 28px 10px;text-align:center;">
              <div style="font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-size:44px;line-height:1;font-weight:400;letter-spacing:0.5px;color:#111827;">METY</div>
              <p style="margin:10px 0 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#71717a;">Educational AI Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 0;">
              <h2 style="margin:0 0 12px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;line-height:1.25;color:#18181b;">Verify your email address</h2>
              <p style="margin:0 0 12px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#3f3f46;">Thanks for joining METY. Confirm your email to activate your account and sign in.</p>
              <p style="margin:0 0 22px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#71717a;">This verification link expires in 24 hours.</p>
              <a href="${verifyUrl}" style="display:inline-block;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">Verify Email</a>
              <p style="margin:18px 0 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#71717a;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br/>${verifyUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 26px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#a1a1aa;">If you did not create this account, you can ignore this email.</td>
          </tr>
        </table>
      </div>
    `;
}

function verificationText(verifyUrl: string): string {
  return `Welcome to METY. Verify your email by opening this link: ${verifyUrl}. This link expires in 24 hours.`;
}

export async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  if (!config.resendApiKey?.trim()) {
    const msg = 'RESEND_API_KEY is not set.';
    console.error(
      JSON.stringify({
        event: 'mail_send_failed',
        recipient: email,
        providerMessage: msg,
      }),
    );
    throw new Error(msg);
  }

  if (!config.mailFrom?.trim()) {
    const msg = 'MAIL_FROM is not set.';
    console.error(
      JSON.stringify({
        event: 'mail_send_failed',
        recipient: email,
        providerMessage: msg,
      }),
    );
    throw new Error(msg);
  }

  const resend = new Resend(config.resendApiKey);
  const html = verificationHtml(verifyUrl);
  const text = verificationText(verifyUrl);

  const { error } = await resend.emails.send({
    from: config.mailFrom,
    to: email,
    subject: VERIFY_SUBJECT,
    html,
    text,
  });

  if (error) {
    const providerMessage = error.message;
    console.error(
      JSON.stringify({
        event: 'mail_send_failed',
        recipient: email,
        providerMessage,
        providerCode: error.name,
        statusCode: error.statusCode,
      }),
    );
    throw new Error(`Resend rejected email: ${providerMessage}`);
  }
}
