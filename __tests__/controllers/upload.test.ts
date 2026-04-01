import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExtract, mockDelete, mockTranslate, mockTranslateStream } = vi.hoisted(() => ({
  mockExtract: vi.fn(),
  mockDelete: vi.fn(),
  mockTranslate: vi.fn(),
  mockTranslateStream: vi.fn(),
}));

vi.mock('../../services/pdf.js', () => ({
  extractTextFromPdf: (...a: any[]) => mockExtract(...a),
  deleteFile: (...a: any[]) => mockDelete(...a),
}));
vi.mock('../../services/cohere.js', () => ({
  translateContent: (...a: any[]) => mockTranslate(...a),
  translateContentStream: (...a: any[]) => mockTranslateStream(...a),
}));

import { uploadPdfFile, uploadPdfFileStream } from '../../controllers/upload.js';
import type { Request, Response } from 'express';

function mockReq(o: Partial<Request> = {}): Request {
  return { body: {}, file: undefined, ...o } as unknown as Request;
}
function mockRes() {
  const r: any = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  r.setHeader = vi.fn().mockReturnValue(r);
  r.write = vi.fn().mockReturnValue(true);
  r.end = vi.fn();
  return r as Response;
}

describe('uploadPdfFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 when no file', async () => {
    const res = mockRes();
    await uploadPdfFile(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('422 when text empty', async () => {
    mockExtract.mockResolvedValue('   ');
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFile(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any }), res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('200 on success', async () => {
    mockExtract.mockResolvedValue('Hello');
    mockTranslate.mockResolvedValue('Bonjour');
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFile(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any, body: { language: 'French' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ originalName: 't.pdf', targetLanguage: 'French', extractedText: 'Hello', translatedText: 'Bonjour' });
  });

  it('defaults to French', async () => {
    mockExtract.mockResolvedValue('Hi');
    mockTranslate.mockResolvedValue('Salut');
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFile(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any, body: {} }), res);
    expect(mockTranslate).toHaveBeenCalledWith('Hi', 'French');
  });

  it('500 on error, still deletes', async () => {
    mockExtract.mockRejectedValue(new Error('fail'));
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFile(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any }), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('uploadPdfFileStream', () => {
  beforeEach(() => vi.clearAllMocks());

  it('error event when no file', async () => {
    const res = mockRes();
    await uploadPdfFileStream(mockReq(), res);
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'));
    expect(res.end).toHaveBeenCalled();
  });

  it('error event when text empty', async () => {
    mockExtract.mockResolvedValue('   ');
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFileStream(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any }), res);
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'));
  });

  it('complete event on success', async () => {
    mockExtract.mockResolvedValue('Hello');
    mockTranslateStream.mockImplementation(async (_t: string, _l: string, cb: (t: string) => void) => { cb('Bonjour'); });
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFileStream(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any, body: { language: 'French' } }), res);
    const w = (res.write as any).mock.calls.map((c: any[]) => c[0]);
    expect(w.some((s: string) => s.includes('event: complete'))).toBe(true);
  });

  it('error event on failure, deletes file', async () => {
    mockExtract.mockRejectedValue(new Error('fail'));
    mockDelete.mockResolvedValue(undefined);
    const res = mockRes();
    await uploadPdfFileStream(mockReq({ file: { path: '/t.pdf', originalname: 't.pdf' } as any }), res);
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'));
    expect(mockDelete).toHaveBeenCalled();
  });
});
