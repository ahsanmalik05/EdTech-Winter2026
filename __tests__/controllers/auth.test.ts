import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockHash, mockCompare, mockSign, mockVerify, mockCreateToken, mockSendVerification } =
  vi.hoisted(() => ({
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockHash: vi.fn(),
    mockCompare: vi.fn(),
    mockSign: vi.fn(),
    mockVerify: vi.fn(),
    mockCreateToken: vi.fn(),
    mockSendVerification: vi.fn(),
  }));

vi.mock('../../db/index.js', () => ({
  db: {
    select: () => ({ from: mockDbSelect }),
    insert: () => ({ values: mockDbInsert }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  users: 'users_table',
}));
vi.mock('bcrypt', () => ({
  default: { hash: (...args: unknown[]) => mockHash(...args), compare: (...args: unknown[]) => mockCompare(...args) },
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: (...args: unknown[]) => mockSign(...args), verify: (...args: unknown[]) => mockVerify(...args) },
}));
vi.mock('../../services/email_verification.js', () => ({
  createEmailVerificationToken: (...args: unknown[]) => mockCreateToken(...args),
}));
vi.mock('../../services/mailer.js', () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerification(...args),
}));

import { register, login, me, resendVerificationEmail } from '../../controllers/auth.js';
import type { Request, Response } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, cookies: {}, headers: {}, ...overrides } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when email or password is missing', async () => {
    const res = mockRes();
    await register(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
  });

  it('returns 400 when user already exists', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) });
    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
  });

  it('returns 201 with verification contract when sendVerificationEmail succeeds', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockHash.mockResolvedValue('hashed');
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        { id: 1, email: 'a@b.com', emailVerified: false },
      ]),
    });
    mockCreateToken.mockResolvedValue('raw_verify_token');
    mockSendVerification.mockResolvedValue(undefined);

    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: 'a@b.com', emailVerified: false },
      message: 'Registration successful. Please verify your email before logging in.',
      verificationRequired: true,
    });
    expect(mockSendVerification).toHaveBeenCalled();
  });

  it('returns 201 when sendVerificationEmail throws after user creation', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockHash.mockResolvedValue('hashed');
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        { id: 1, email: 'a@b.com', emailVerified: false },
      ]),
    });
    mockCreateToken.mockResolvedValue('raw_verify_token');
    mockSendVerification.mockRejectedValue(new Error('Resend down'));

    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: 'a@b.com', emailVerified: false },
      message: 'Registration successful. Please verify your email before logging in.',
      verificationRequired: true,
    });
  });

  it('returns 500 when insert returns empty', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockHash.mockResolvedValue('hashed');
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });

    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 on unexpected error', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockRejectedValue(new Error('db error')) });
    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when email or password missing', async () => {
    const res = mockRes();
    await login(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user not found', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns 401 when password is wrong', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 1, email: 'x@y.com', password: 'hash' }]),
    });
    mockCompare.mockResolvedValue(false);
    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'wrong' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when email is not verified', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 1, email: 'x@y.com', password: 'hash', emailVerified: false },
      ]),
    });
    mockCompare.mockResolvedValue(true);
    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'right' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email is not verified. Please check your inbox.',
      verificationRequired: true,
    });
  });

  it('returns 200 and sets cookie on success (no token in JSON body)', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 1, email: 'x@y.com', password: 'hash', emailVerified: true },
      ]),
    });
    mockCompare.mockResolvedValue(true);
    mockSign.mockReturnValue('tok');

    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'right' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith('token', 'tok', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: 'x@y.com' },
    });
  });

  it('returns 500 on unexpected error', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockRejectedValue(new Error('err')) });
    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no token cookie', async () => {
    const res = mockRes();
    await me(mockReq({ cookies: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 404 when user not found', async () => {
    mockVerify.mockReturnValue({ id: 99 });
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const res = mockRes();
    await me(mockReq({ cookies: { token: 'tok' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with user on success', async () => {
    mockVerify.mockReturnValue({ id: 1 });
    const user = { id: 1, email: 'a@b.com', createdAt: new Date(), emailVerified: true };
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([user]) });

    const res = mockRes();
    await me(mockReq({ cookies: { token: 'tok' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user });
  });

  it('returns 500 on error', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('bad token');
    });
    const res = mockRes();
    await me(mockReq({ cookies: { token: 'bad' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('resendVerificationEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const res = mockRes();
    await resendVerificationEmail(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with generic message when user missing or already verified', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    const res = mockRes();
    await resendVerificationEmail(mockReq({ body: { email: 'nope@x.com' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'If this account exists, a verification email has been sent.',
    });
    expect(mockSendVerification).not.toHaveBeenCalled();
  });

  it('returns 200 when send succeeds for unverified user', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 2, email: 'u@x.com', emailVerified: false },
      ]),
    });
    mockCreateToken.mockResolvedValue('tok2');
    mockSendVerification.mockResolvedValue(undefined);

    const res = mockRes();
    await resendVerificationEmail(mockReq({ body: { email: 'u@x.com' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Verification email sent.' });
    expect(mockSendVerification).toHaveBeenCalled();
  });

  it('returns 500 when Resend send fails', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 2, email: 'u@x.com', emailVerified: false },
      ]),
    });
    mockCreateToken.mockResolvedValue('tok2');
    mockSendVerification.mockRejectedValue(new Error('rate limited'));

    const res = mockRes();
    await resendVerificationEmail(mockReq({ body: { email: 'u@x.com' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to resend verification email' });
  });
});
