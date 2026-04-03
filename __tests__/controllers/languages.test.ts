import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelectFrom, mockDbInsert, mockDbDelete } = vi.hoisted(() => ({
  mockDbSelectFrom: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbDelete: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: () => ({ from: mockDbSelectFrom }),
    insert: () => ({ values: mockDbInsert }),
    delete: () => ({ where: mockDbDelete }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  languages: 'languages_table',
}));

import {
  availableLanguages,
  getLanguage,
  addLanguage,
  deleteLanguage,
} from '../../controllers/languages.js';
import type { Request, Response } from 'express';

/* ── helpers ── */
function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, query: {}, params: {}, headers: {}, ...overrides } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

/* ── availableLanguages ── */
describe('availableLanguages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with languages', async () => {
    const langs = [{ id: 1, name: 'French', code: 'fr' }];
    mockDbSelectFrom.mockReturnValue({ execute: vi.fn().mockResolvedValue(langs) });

    const res = mockRes();
    await availableLanguages(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(langs);
  });

  it('returns 500 on error', async () => {
    mockDbSelectFrom.mockReturnValue({ execute: vi.fn().mockRejectedValue(new Error('db')) });
    const res = mockRes();
    await availableLanguages(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── getLanguage ── */
describe('getLanguage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when neither code nor name is provided', async () => {
    const res = mockRes();
    await getLanguage(mockReq({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Provide either code or name' });
  });

  it('returns 400 when code has spaces', async () => {
    const res = mockRes();
    await getLanguage(mockReq({ query: { code: 'a b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Code must be a non-empty string without spaces' });
  });

  it('returns 400 when code is empty', async () => {
    const res = mockRes();
    await getLanguage(mockReq({ query: { code: ' ' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when name has spaces', async () => {
    const res = mockRes();
    await getLanguage(mockReq({ query: { name: 'a b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when language not found by code', async () => {
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockReturnValue({ then: (fn: Function) => Promise.resolve(fn([])) }),
      }),
    });
    const res = mockRes();
    await getLanguage(mockReq({ query: { code: 'zz' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with language when found by code', async () => {
    const lang = { id: 1, name: 'French', code: 'fr' };
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockReturnValue({ then: (fn: Function) => Promise.resolve(fn([lang])) }),
      }),
    });
    const res = mockRes();
    await getLanguage(mockReq({ query: { code: 'fr' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ language: lang });
  });

  it('returns 500 on error', async () => {
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockReturnValue({ then: () => Promise.reject(new Error('err')) }),
      }),
    });
    const res = mockRes();
    await getLanguage(mockReq({ query: { code: 'fr' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── addLanguage ── */
describe('addLanguage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when name or code is missing', async () => {
    const res = mockRes();
    await addLanguage(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Name and code are required' });
  });

  it('returns 400 when name or code exceeds max length', async () => {
    const res = mockRes();
    await addLanguage(mockReq({ body: { name: 'a'.repeat(256), code: 'fr' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Name or code exceeds maximum length' });
  });

  it('returns 400 when name has spaces', async () => {
    const res = mockRes();
    await addLanguage(mockReq({ body: { name: 'a b', code: 'fr' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Name and code must be non-empty strings without spaces' });
  });

  it('returns 409 when language code already exists', async () => {
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });
    const res = mockRes();
    await addLanguage(mockReq({ body: { name: 'French', code: 'fr' } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Language code already exists' });
  });

  it('returns 201 on success', async () => {
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([]),
      }),
    });
    const newLang = { id: 2, name: 'German', code: 'de' };
    mockDbInsert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([newLang]),
    });

    const res = mockRes();
    await addLanguage(mockReq({ body: { name: 'German', code: 'de' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ language: [newLang] });
  });

  it('returns 500 on error', async () => {
    mockDbSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error('db')),
      }),
    });
    const res = mockRes();
    await addLanguage(mockReq({ body: { name: 'German', code: 'de' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── deleteLanguage ── */
describe('deleteLanguage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id param is missing', async () => {
    const res = mockRes();
    await deleteLanguage(mockReq({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when id is not a valid integer', async () => {
    const res = mockRes();
    await deleteLanguage(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when language not found', async () => {
    mockDbDelete.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });
    const res = mockRes();
    await deleteLanguage(mockReq({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on successful delete', async () => {
    mockDbDelete.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    });
    const res = mockRes();
    await deleteLanguage(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Language deleted successfully' });
  });

  it('returns 500 on error', async () => {
    mockDbDelete.mockReturnValue({
      returning: vi.fn().mockRejectedValue(new Error('db')),
    });
    const res = mockRes();
    await deleteLanguage(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
