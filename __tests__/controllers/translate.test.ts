import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTranslateBatch } = vi.hoisted(() => ({
  mockTranslateBatch: vi.fn(),
}));

vi.mock('../../services/cohere.js', () => ({
  translateBatch: mockTranslateBatch,
}));

import { batchTranslate } from '../../controllers/translate.js';
import type { Request, Response } from 'express';

/* ── helpers ── */
function mockReq(body: unknown): Request {
  return { body } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

/* ── tests ── */
describe('batchTranslate controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when targetLanguage is missing', async () => {
    const req = mockReq({ items: [{ id: '1', text: 'hi' }] });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'targetLanguage is required and must be a string' });
  });

  it('returns 400 when targetLanguage is not a string', async () => {
    const req = mockReq({ items: [{ id: '1', text: 'hi' }], targetLanguage: 123 });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when items is not an array', async () => {
    const req = mockReq({ items: 'bad', targetLanguage: 'French' });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'items must be a non-empty array of { id, text } objects' });
  });

  it('returns 400 when items is empty', async () => {
    const req = mockReq({ items: [], targetLanguage: 'French' });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when an item has invalid shape', async () => {
    const req = mockReq({ items: [{ id: 1, text: 'hi' }], targetLanguage: 'French' });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Each item must have a string 'id' and a string 'text' property",
    });
  });

  it('returns 400 when gradeLevel is not a string', async () => {
    const req = mockReq({ items: [{ id: '1', text: 'hi' }], targetLanguage: 'French', gradeLevel: 5 });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'gradeLevel must be a string if provided' });
  });

  it('returns 200 with results on success', async () => {
    const fakeResults = { '1': { translatedText: 'bonjour' } };
    mockTranslateBatch.mockResolvedValue(fakeResults);

    const req = mockReq({
      items: [{ id: '1', text: 'hello' }],
      targetLanguage: 'French',
    });
    const res = mockRes();
    await batchTranslate(req as any, res);

    expect(mockTranslateBatch).toHaveBeenCalledWith(
      [{ id: '1', text: 'hello' }],
      'French',
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ results: fakeResults });
  });

  it('passes gradeLevel to translateBatch when provided', async () => {
    mockTranslateBatch.mockResolvedValue({});
    const req = mockReq({
      items: [{ id: '1', text: 'hi' }],
      targetLanguage: 'Spanish',
      gradeLevel: '5th grade',
    });
    const res = mockRes();
    await batchTranslate(req as any, res);

    expect(mockTranslateBatch).toHaveBeenCalledWith(
      [{ id: '1', text: 'hi' }],
      'Spanish',
      '5th grade',
    );
  });

  it('returns 500 when translateBatch throws', async () => {
    mockTranslateBatch.mockRejectedValue(new Error('boom'));
    const req = mockReq({
      items: [{ id: '1', text: 'hi' }],
      targetLanguage: 'French',
    });
    const res = mockRes();
    await batchTranslate(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to perform batch translation' });
  });
});
