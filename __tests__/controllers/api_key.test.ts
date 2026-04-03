import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockDbUpdate, mockDbDelete, mockSign, mockVerify } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbDelete: vi.fn(),
  mockSign: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: () => ({ from: mockDbSelect }),
    insert: () => ({ values: mockDbInsert }),
    update: () => ({ set: mockDbUpdate }),
    delete: () => ({ where: mockDbDelete }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  users: 'users_table',
  api_keys: 'api_keys_table',
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: (...args: any[]) => mockSign(...args), verify: (...args: any[]) => mockVerify(...args) },
}));
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

import {
  createApiKey,
  getApiKeys,
  getApiKeyData,
  updateApiKey,
  deleteApiKey,
} from '../../controllers/api_key.js';
import type { Request, Response } from 'express';

/* ── helpers ── */
function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, headers: {}, params: {}, ...overrides } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

/* ── createApiKey tests ── */
describe('createApiKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when label or scopes missing', async () => {
    const res = mockRes();
    await createApiKey(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
  });

  it('returns 401 when no auth header', async () => {
    const res = mockRes();
    await createApiKey(mockReq({ body: { label: 'test', scopes: ['read'] }, headers: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 401 when user does not exist', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 99 });
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const res = mockRes();
    await createApiKey(
      mockReq({
        body: { label: 'test', scopes: ['read'] },
        headers: { authorization: 'Bearer tok' },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 201 on successful creation', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 1 });
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) });
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{
        id: 10,
        key: 'hashed',
        label: 'test',
        scopes: ['read'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
    });

    const res = mockRes();
    await createApiKey(
      mockReq({
        body: { label: 'test', scopes: ['read'] },
        headers: { authorization: 'Bearer tok' },
        user: { id: 1 },
      } as any),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 when insert fails', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 1 });
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) });
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });

    const res = mockRes();
    await createApiKey(
      mockReq({
        body: { label: 'test', scopes: ['read'] },
        headers: { authorization: 'Bearer tok' },
        user: { id: 1 },
      } as any),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── getApiKeys tests ── */
describe('getApiKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no auth header', async () => {
    const res = mockRes();
    await getApiKeys(mockReq({ headers: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 with keys', async () => {
    process.env.JWT_SECRET = 'test-secret';
    mockVerify.mockReturnValue({ id: 1 });
    const keys = [{ id: 1, label: 'k' }];
    mockDbSelect.mockReturnValue({ where: vi.fn().mockResolvedValue(keys) });

    const res = mockRes();
    await getApiKeys(
      mockReq({ headers: { authorization: 'Bearer tok' }, user: { id: 1 } } as any),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ allKeys: keys });
  });

  it('returns 500 on error', async () => {
    mockDbSelect.mockReturnValue({ where: vi.fn().mockRejectedValue(new Error('db fail')) });
    const res = mockRes();
    await getApiKeys(mockReq({ headers: { authorization: 'Bearer bad' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── getApiKeyData tests ── */
describe('getApiKeyData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is NaN', async () => {
    const res = mockRes();
    await getApiKeyData(mockReq({ params: { id: 'abc' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when key not found', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    const res = mockRes();
    await getApiKeyData(mockReq({ params: { id: '5' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when key not found by id and user', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });

    const res = mockRes();
    await getApiKeyData(
      mockReq({ params: { id: '5' }, user: { id: 1 } } as any),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with api key data on success', async () => {
    mockDbSelect.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: 5, key: 'hash', label: 'test', scopes: ['read'],
          users_id: 1, publicKey: 'pk', createdAt: new Date(), updatedAt: new Date(),
        }]),
      }),
    });

    const res = mockRes();
    await getApiKeyData(
      mockReq({ params: { id: '5' }, user: { id: 1 } } as any),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* ── updateApiKey tests ── */
describe('updateApiKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is invalid', async () => {
    const res = mockRes();
    await updateApiKey(mockReq({ params: { id: 'abc' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid ID' });
  });

  it('returns 400 when nothing to update', async () => {
    const res = mockRes();
    await updateApiKey(mockReq({ params: { id: '1' }, body: {}, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Nothing to update' });
  });

  it('returns 404 when key not found', async () => {
    mockDbUpdate.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    const res = mockRes();
    await updateApiKey(mockReq({ params: { id: '1' }, body: { label: 'new' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on success', async () => {
    const updatedKey = {
      id: 1, key: 'hash', label: 'new', scopes: ['read'],
      users_id: 1, publicKey: 'pk', createdAt: new Date(), updatedAt: new Date(),
    };
    mockDbUpdate.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedKey]),
      }),
    });
    const res = mockRes();
    await updateApiKey(mockReq({ params: { id: '1' }, body: { label: 'new' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* ── deleteApiKey tests ── */
describe('deleteApiKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is invalid', async () => {
    const res = mockRes();
    await deleteApiKey(mockReq({ params: { id: 'abc' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when key not found', async () => {
    mockDbDelete.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });
    const res = mockRes();
    await deleteApiKey(mockReq({ params: { id: '1' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on success', async () => {
    mockDbDelete.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    });
    const res = mockRes();
    await deleteApiKey(mockReq({ params: { id: '1' }, user: { id: 1 } } as any), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'API key deleted successfully' });
  });
});
