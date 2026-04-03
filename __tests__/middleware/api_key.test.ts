import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelectFrom } = vi.hoisted(() => ({
  mockDbSelectFrom: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: () => ({ from: mockDbSelectFrom }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  api_keys: 'api_keys_table',
}));

import { apiKeyMiddleware } from '../../middleware/api_key.js';
import type { Request, Response, NextFunction } from 'express';

function mockReq(o: Partial<Request> = {}): Request {
  return { path: '/api/translate/batch', headers: {}, ...o } as unknown as Request;
}
function mockRes() {
  const r: any = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  return r as Response;
}

describe('apiKeyMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() for /api/auth paths', async () => {
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ path: '/auth/login' }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() for /keys paths', async () => {
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ path: '/keys' }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when x-api-key missing', async () => {
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ headers: {} }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when key format invalid', async () => {
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ headers: { 'x-api-key': 'invalid_key' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
  });

  it('returns 401 when key not found in DB', async () => {
    mockDbSelectFrom.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) });
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ headers: { 'x-api-key': 'mety_live_pubkey_raw' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when hash mismatch', async () => {
    mockDbSelectFrom.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{
      id: 1, key: 'wrong_hash', users_id: 1, label: 'test', scopes: ['read'],
      publicKey: 'pubkey', createdAt: new Date(), updatedAt: new Date(),
    }]) }) });
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ headers: { 'x-api-key': 'mety_live_pubkey_raw' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() on valid key', async () => {
    const crypto = await import('crypto');
    const rawKey = 'mety_live_pubkey_rawsecret';
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    mockDbSelectFrom.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{
      id: 1, key: hash, users_id: 1, label: 'test', scopes: ['read'],
      publicKey: 'pubkey', createdAt: new Date(), updatedAt: new Date(),
    }]) }) });
    const req = mockReq({ headers: { 'x-api-key': rawKey } });
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).apiKey).toBeDefined();
    expect((req as any).apiKey.label).toBe('test');
  });

  it('returns 500 on unexpected error', async () => {
    mockDbSelectFrom.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockRejectedValue(new Error('db error')) }) });
    const res = mockRes();
    const next = vi.fn();
    await apiKeyMiddleware(mockReq({ headers: { 'x-api-key': 'mety_live_pubkey_raw' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to verify API key' });
  });
});
