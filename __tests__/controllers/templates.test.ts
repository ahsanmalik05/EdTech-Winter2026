import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGenerateTemplate,
  mockGetTemplateById,
  mockListTemplates,
  mockUpdateTemplate,
  mockDeactivateTemplate,
  mockNormalizeInputs,
  mockValidateInBackground,
  mockLogTemplateGeneration,
} = vi.hoisted(() => ({
  mockGenerateTemplate: vi.fn(),
  mockGetTemplateById: vi.fn(),
  mockListTemplates: vi.fn(),
  mockUpdateTemplate: vi.fn(),
  mockDeactivateTemplate: vi.fn(),
  mockNormalizeInputs: vi.fn(),
  mockValidateInBackground: vi.fn(),
  mockLogTemplateGeneration: vi.fn(),
}));

vi.mock('../../services/templates.js', () => ({
  DEFAULT_TEMPLATE_MODEL: 'gpt-5-nano',
  generateTemplate: (...args: any[]) => mockGenerateTemplate(...args),
  getTemplateById: (...args: any[]) => mockGetTemplateById(...args),
  listTemplates: (...args: any[]) => mockListTemplates(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deactivateTemplate: (...args: any[]) => mockDeactivateTemplate(...args),
}));

vi.mock('../../services/openai.js', () => ({
  normalizeInputs: (...args: any[]) => mockNormalizeInputs(...args),
  validateInBackground: (...args: any[]) => mockValidateInBackground(...args),
}));

vi.mock('../../services/template_generation_log.js', () => ({
  logTemplateGeneration: (...args: any[]) => mockLogTemplateGeneration(...args),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalizeInputs.mockResolvedValue({
      subject: 'Math',
      topic: 'Algebra',
      gradeLevel: '8th Grade',
    });
    mockLogTemplateGeneration.mockResolvedValue(123);
  });

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
    const template = {
      response: {
        id: 1,
        subject: 'Math',
        topic: 'Algebra',
        gradeLevel: '8th Grade',
        version: 1,
        isActive: true,
        sections: {
          introduction: 'intro',
          model_assessment: 'assessment',
          self_review: 'review',
        },
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
      usage: null,
    };
    mockGenerateTemplate.mockResolvedValue(template);

    const res = mockRes();
    await generate(
      mockReq({ body: { subject: 'Math', topic: 'Algebra', gradeLevel: '8th' } }) as any,
      res,
    );
    expect(mockNormalizeInputs).toHaveBeenCalledWith('Math', 'Algebra', '8th');
    expect(mockGenerateTemplate).toHaveBeenCalledWith(
      { subject: 'Math', topic: 'Algebra', gradeLevel: '8th Grade' },
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(template.response);
  });

  it('returns 400 when normalized input is invalid', async () => {
    mockNormalizeInputs.mockRejectedValue(
      Object.assign(new Error('Please enter a valid school subject and topic.'), {
        name: 'InputNormalizationError',
        issues: ['Subject is not a plausible academic subject.'],
      }),
    );

    const res = mockRes();
    await generate(
      mockReq({ body: { subject: 'bad guy', topic: 'peron', gradeLevel: '8th' } }) as any,
      res,
    );

    expect(mockGenerateTemplate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Please enter a valid school subject and topic.',
      issues: ['Subject is not a plausible academic subject.'],
    });
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
    expect(mockListTemplates).toHaveBeenCalledWith(
      {
        subject: 'Math',
        gradeLevel: '8th',
        isActive: true,
      },
      undefined,
    );
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
