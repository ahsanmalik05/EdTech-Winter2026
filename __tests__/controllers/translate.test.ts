import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const {
  mockTranslateBatch,
  mockExtractTextFromPdf,
  mockDeleteFile,
  mockComputeFileHash,
  mockComputeTextHash,
  mockUploadToBucket,
  mockFindUploadedByHash,
  mockRecordPdfUpload,
  mockGetOrCreateSourceDocument,
  mockFindCachedTranslation,
  mockLogTranslation,
} = vi.hoisted(() => ({
  mockTranslateBatch: vi.fn(),
  mockExtractTextFromPdf: vi.fn(),
  mockDeleteFile: vi.fn(),
  mockComputeFileHash: vi.fn(),
  mockComputeTextHash: vi.fn(),
  mockUploadToBucket: vi.fn(),
  mockFindUploadedByHash: vi.fn(),
  mockRecordPdfUpload: vi.fn(),
  mockGetOrCreateSourceDocument: vi.fn(),
  mockFindCachedTranslation: vi.fn(),
  mockLogTranslation: vi.fn(),
}));

vi.mock("../../services/cohere.js", () => ({
  translateBatch: (...args: unknown[]) => mockTranslateBatch(...args),
  translateContent: vi.fn(),
}));

vi.mock("../../services/pdf.js", () => ({
  extractTextFromPdf: (...args: unknown[]) => mockExtractTextFromPdf(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

vi.mock("../../services/bucket.js", () => ({
  computeFileHash: (...args: unknown[]) => mockComputeFileHash(...args),
  computeTextHash: (...args: unknown[]) => mockComputeTextHash(...args),
  isBucketConfigured: () => true,
  uploadToBucket: (...args: unknown[]) => mockUploadToBucket(...args),
}));

vi.mock("../../services/pdf_uploads.js", () => ({
  findUploadedByHash: (...args: unknown[]) => mockFindUploadedByHash(...args),
  recordPdfUpload: (...args: unknown[]) => mockRecordPdfUpload(...args),
}));

vi.mock("../../services/translation_cache.js", () => ({
  getOrCreateSourceDocument: (...args: unknown[]) =>
    mockGetOrCreateSourceDocument(...args),
  findCachedTranslation: (...args: unknown[]) =>
    mockFindCachedTranslation(...args),
}));

vi.mock("../../services/translation_log.js", () => ({
  logTranslation: (...args: unknown[]) => mockLogTranslation(...args),
  getTranslationStatsFromDb: vi.fn(),
}));

import { batchTranslate } from "../../controllers/translate.js";

function makeFile(name = "worksheet.pdf") {
  return {
    path: `/tmp/${name}`,
    originalname: name,
    fieldname: "pdfs",
    mimetype: "application/pdf",
    size: 222,
  } as Express.Multer.File;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    files: undefined,
    user: undefined,
    apiKey: undefined,
    ...overrides,
  } as Request;
}

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.json as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res as Response;
}

describe("batchTranslate controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeFileHash.mockResolvedValue("file-hash");
    mockComputeTextHash.mockReturnValue("text-hash");
    mockFindUploadedByHash.mockResolvedValue(null);
    mockUploadToBucket.mockResolvedValue({
      objectKey: "pdf-archives/dev/file-hash.pdf",
      uploaded: true,
    });
    mockRecordPdfUpload.mockResolvedValue(1);
    mockExtractTextFromPdf.mockResolvedValue("Hello");
    mockGetOrCreateSourceDocument.mockResolvedValue({ id: 10, textHash: "text-hash" });
    mockFindCachedTranslation.mockResolvedValue(null);
    mockTranslateBatch.mockResolvedValue({
      "worksheet.pdf": {
        data: { translatedText: "Bonjour", notes: "" },
        tokenCount: 4,
      },
    });
    mockLogTranslation.mockResolvedValue(1);
    mockDeleteFile.mockResolvedValue(undefined);
  });

  it("returns 400 when targetLanguage is missing", async () => {
    const res = mockRes();

    await batchTranslate(
      mockReq({ files: [makeFile()] as unknown as Request["files"] }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "targetLanguage is required and must be a string",
    });
  });

  it("returns 400 when no files are provided", async () => {
    const res = mockRes();

    await batchTranslate(
      mockReq({ body: { targetLanguage: "French" }, files: [] as unknown as Request["files"] }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one PDF file is required",
    });
  });

  it("returns 400 when gradeLevel is invalid", async () => {
    const res = mockRes();

    await batchTranslate(
      mockReq({
        body: { targetLanguage: "French", gradeLevel: 5 },
        files: [makeFile()] as unknown as Request["files"],
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "gradeLevel must be a string if provided",
    });
  });

  it("returns 422 when PDF extraction is empty", async () => {
    mockExtractTextFromPdf.mockResolvedValue("   ");
    const res = mockRes();

    await batchTranslate(
      mockReq({
        body: { targetLanguage: "French" },
        files: [makeFile()] as unknown as Request["files"],
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error:
        'Could not extract text from "worksheet.pdf". The file may be image-based or empty.',
    });
    expect(mockDeleteFile).toHaveBeenCalledWith("/tmp/worksheet.pdf");
  });

  it("returns translated results on success", async () => {
    const res = mockRes();

    await batchTranslate(
      mockReq({
        body: { targetLanguage: "French", gradeLevel: "5th grade" },
        files: [makeFile()] as unknown as Request["files"],
      }),
      res,
    );

    expect(mockRecordPdfUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "batch",
        fieldName: "pdfs",
        contentHash: "file-hash",
      }),
    );
    expect(mockTranslateBatch).toHaveBeenCalledWith(
      [{ id: "worksheet.pdf", text: "Hello" }],
      "French",
      "5th grade",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      results: {
        "worksheet.pdf": {
          data: { translatedText: "Bonjour", notes: "" },
          tokenCount: 4,
        },
      },
    });
  });
});
