import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockHash, mockCompare, mockSign, mockVerify } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
  mockSign: vi.fn(),
  mockVerify: vi.fn(),
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
  default: { hash: (...args: any[]) => mockHash(...args), compare: (...args: any[]) => mockCompare(...args) },
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: (...args: any[]) => mockSign(...args), verify: (...args: any[]) => mockVerify(...args) },
}));

import { register, login, me } from '../../controllers/auth.js';
import type { Request, Response } from 'express';

/* ── helpers ── */
function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, headers: {}, ...overrides } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

/* ── register tests ── */
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

  it('returns 201 on successful registration', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockHash.mockResolvedValue('hashed');
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1, email: 'a@b.com' }]),
    });
    mockSign.mockReturnValue('jwt_token');
    process.env.JWT_SECRET = 'test-secret';

    const res = mockRes();
    await register(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: 'a@b.com' },
      token: 'jwt_token',
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

/* ── login tests ── */
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

  it('returns 200 with token on success', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 1, email: 'x@y.com', password: 'hash' }]),
    });
    mockCompare.mockResolvedValue(true);
    mockSign.mockReturnValue('tok');
    process.env.JWT_SECRET = 'test-secret';

    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'right' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: 'x@y.com' },
      token: 'tok',
    });
  });

  it('returns 500 on unexpected error', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockRejectedValue(new Error('err')) });
    const res = mockRes();
    await login(mockReq({ body: { email: 'x@y.com', password: 'pw' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── me tests ── */
describe('me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no auth header', async () => {
    const res = mockRes();
    await me(mockReq({ headers: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when auth header does not start with Bearer', async () => {
    const res = mockRes();
    await me(mockReq({ headers: { authorization: 'Basic abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 404 when user not found', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 99 });
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const res = mockRes();
    await me(mockReq({ headers: { authorization: 'Bearer tok' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with user on success', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 1 });
    const user = { id: 1, email: 'a@b.com', createdAt: new Date() };
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([user]) });

    const res = mockRes();
    await me(mockReq({ headers: { authorization: 'Bearer tok' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user });
  });

  it('returns 500 on error', async () => {
    mockVerify.mockImplementation(() => { throw new Error('bad token'); });
    const res = mockRes();
    await me(mockReq({ headers: { authorization: 'Bearer bad' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
