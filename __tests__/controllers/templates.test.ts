import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGenerateTemplate,
  mockGetTemplateById,
  mockListTemplates,
  mockUpdateTemplate,
  mockDeactivateTemplate,
} = vi.hoisted(() => ({
  mockGenerateTemplate: vi.fn(),
  mockGetTemplateById: vi.fn(),
  mockListTemplates: vi.fn(),
  mockUpdateTemplate: vi.fn(),
  mockDeactivateTemplate: vi.fn(),
}));

vi.mock('../../services/templates.js', () => ({
  generateTemplate: (...args: any[]) => mockGenerateTemplate(...args),
  getTemplateById: (...args: any[]) => mockGetTemplateById(...args),
  listTemplates: (...args: any[]) => mockListTemplates(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deactivateTemplate: (...args: any[]) => mockDeactivateTemplate(...args),
}));

import { generate, getById, list, update, deactivate } from '../../controllers/templates.js';
import type { Request, Response } from 'express';

/* ── helpers ── */
function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, query: {}, ...overrides } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
}

/* ── generate ── */
describe('generate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when subject is missing', async () => {
    const res = mockRes();
    await generate(mockReq({ body: { topic: 'x', gradeLevel: 'y' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'subject is required and must be a string' });
  });

  it('returns 400 when topic is missing', async () => {
    const res = mockRes();
    await generate(mockReq({ body: { subject: 'x', gradeLevel: 'y' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'topic is required and must be a string' });
  });

  it('returns 400 when gradeLevel is missing', async () => {
    const res = mockRes();
    await generate(mockReq({ body: { subject: 'x', topic: 'y' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'gradeLevel is required and must be a string' });
  });

  it('returns 201 on success', async () => {
    const template = { id: 1, subject: 'Math', topic: 'Algebra', gradeLevel: '8th' };
    mockGenerateTemplate.mockResolvedValue(template);

    const res = mockRes();
    await generate(
      mockReq({ body: { subject: 'Math', topic: 'Algebra', gradeLevel: '8th' } }) as any,
      res,
    );
    expect(mockGenerateTemplate).toHaveBeenCalledWith({ subject: 'Math', topic: 'Algebra', gradeLevel: '8th' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(template);
  });

  it('returns 500 on error', async () => {
    mockGenerateTemplate.mockRejectedValue(new Error('fail'));
    const res = mockRes();
    await generate(
      mockReq({ body: { subject: 'Math', topic: 'Algebra', gradeLevel: '8th' } }) as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── getById ── */
describe('getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is NaN', async () => {
    const res = mockRes();
    await getById(mockReq({ params: { id: 'abc' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when template not found', async () => {
    mockGetTemplateById.mockResolvedValue(null);
    const res = mockRes();
    await getById(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on success', async () => {
    const tmpl = { id: 1, subject: 'Math' };
    mockGetTemplateById.mockResolvedValue(tmpl);
    const res = mockRes();
    await getById(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tmpl);
  });

  it('returns 500 on error', async () => {
    mockGetTemplateById.mockRejectedValue(new Error('err'));
    const res = mockRes();
    await getById(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── list ── */
describe('list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with templates', async () => {
    const templates = [{ id: 1 }];
    mockListTemplates.mockResolvedValue(templates);
    const res = mockRes();
    await list(mockReq({ query: {} }) as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(templates);
  });

  it('passes filters from query params', async () => {
    mockListTemplates.mockResolvedValue([]);
    const res = mockRes();
    await list(
      mockReq({ query: { subject: 'Math', gradeLevel: '8th', isActive: 'true' } }) as any,
      res,
    );
    expect(mockListTemplates).toHaveBeenCalledWith({
      subject: 'Math',
      gradeLevel: '8th',
      isActive: true,
    });
  });

  it('returns 500 on error', async () => {
    mockListTemplates.mockRejectedValue(new Error('err'));
    const res = mockRes();
    await list(mockReq({ query: {} }) as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── update ── */
describe('update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is NaN', async () => {
    const res = mockRes();
    await update(mockReq({ params: { id: 'abc' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when template not found', async () => {
    mockUpdateTemplate.mockResolvedValue(null);
    const res = mockRes();
    await update(
      mockReq({ params: { id: '1' }, body: { subject: 'Science' } }) as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on success', async () => {
    const tmpl = { id: 1, subject: 'Science' };
    mockUpdateTemplate.mockResolvedValue(tmpl);
    const res = mockRes();
    await update(
      mockReq({ params: { id: '1' }, body: { subject: 'Science' } }) as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tmpl);
  });

  it('returns 500 on error', async () => {
    mockUpdateTemplate.mockRejectedValue(new Error('err'));
    const res = mockRes();
    await update(
      mockReq({ params: { id: '1' }, body: { subject: 'X' } }) as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

/* ── deactivate ── */
describe('deactivate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when id is NaN', async () => {
    const res = mockRes();
    await deactivate(mockReq({ params: { id: 'abc' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when template not found', async () => {
    mockDeactivateTemplate.mockResolvedValue(false);
    const res = mockRes();
    await deactivate(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 204 on success', async () => {
    mockDeactivateTemplate.mockResolvedValue(true);
    const res = mockRes();
    await deactivate(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mockDeactivateTemplate.mockRejectedValue(new Error('err'));
    const res = mockRes();
    await deactivate(mockReq({ params: { id: '1' } }) as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
