import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const {
  mockExtractStructured,
  mockBlocksToText,
  mockDelete,
  mockTranslate,
  mockTranslateStream,
  mockValidateTranslation,
  mockLogTranslation,
  mockLogTranslationValidation,
  mockComputeFileHash,
  mockComputeTextHash,
  mockUploadToBucket,
  mockFindUploadedByHash,
  mockRecordPdfUpload,
  mockGetOrCreateSourceDocument,
  mockFindCachedTranslation,
} = vi.hoisted(() => ({
  mockExtractStructured: vi.fn(),
  mockBlocksToText: vi.fn(),
  mockDelete: vi.fn(),
  mockTranslate: vi.fn(),
  mockTranslateStream: vi.fn(),
  mockValidateTranslation: vi.fn(),
  mockLogTranslation: vi.fn(),
  mockLogTranslationValidation: vi.fn(),
  mockComputeFileHash: vi.fn(),
  mockComputeTextHash: vi.fn(),
  mockUploadToBucket: vi.fn(),
  mockFindUploadedByHash: vi.fn(),
  mockRecordPdfUpload: vi.fn(),
  mockGetOrCreateSourceDocument: vi.fn(),
  mockFindCachedTranslation: vi.fn(),
}));

vi.mock("../../services/pdf.js", () => ({
  extractStructuredTextFromPdf: (...args: unknown[]) =>
    mockExtractStructured(...args),
  blocksToText: (...args: unknown[]) => mockBlocksToText(...args),
  deleteFile: (...args: unknown[]) => mockDelete(...args),
}));

vi.mock("../../services/cohere.js", () => ({
  translateContent: (...args: unknown[]) => mockTranslate(...args),
  translateContentStream: (...args: unknown[]) => mockTranslateStream(...args),
}));

vi.mock("../../services/validate.js", () => ({
  validateTranslation: (...args: unknown[]) => mockValidateTranslation(...args),
}));

vi.mock("../../services/translation_log.js", () => ({
  logTranslation: (...args: unknown[]) => mockLogTranslation(...args),
}));

vi.mock("../../services/translation_validation_log.js", () => ({
  logTranslationValidation: (...args: unknown[]) =>
    mockLogTranslationValidation(...args),
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

import { uploadPdfFile, uploadPdfFileStream } from "../../controllers/upload.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    file: undefined,
    user: undefined,
    apiKey: undefined,
    ...overrides,
  } as Request;
}

type MockUploadResponse = Pick<
  Response,
  "status" | "json" | "setHeader" | "end"
> & {
  write: ReturnType<typeof vi.fn>;
};

function mockRes(): Response & { write: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    write: vi.fn(() => true),
    end: vi.fn(),
  } satisfies MockUploadResponse;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.json as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.setHeader as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res as unknown as Response & { write: typeof res.write };
}

function makeFile() {
  return {
    path: "/tmp/test.pdf",
    originalname: "test.pdf",
    fieldname: "pdf",
    mimetype: "application/pdf",
    size: 123,
  } as Express.Multer.File;
}

const blocks = [{ type: "paragraph", content: "Hello", indent: 0 }];

describe("uploadPdfFile", () => {
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
    mockExtractStructured.mockResolvedValue(blocks);
    mockBlocksToText.mockReturnValue("Hello");
    mockGetOrCreateSourceDocument.mockResolvedValue({ id: 10, textHash: "text-hash" });
    mockFindCachedTranslation.mockResolvedValue(null);
    mockTranslate.mockResolvedValue({
      data: { translatedText: "Bonjour", notes: "ok" },
      tokenCount: 7,
    });
    mockValidateTranslation.mockResolvedValue({
      backTranslated: "Hello",
      similarityScore: 0.9,
      similarityReasoning: "close",
      structuralChecks: {
        sectionCountMatch: true,
        originalSectionCount: 1,
        translatedSectionCount: 1,
        headersIntact: true,
      },
      overallConfidence: 0.95,
    });
    mockLogTranslation.mockResolvedValue(99);
    mockLogTranslationValidation.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
  });

  it("returns 400 when no file is provided", async () => {
    const res = mockRes();

    await uploadPdfFile(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "No PDF file uploaded" });
  });

  it("returns 422 when extracted text is empty", async () => {
    mockBlocksToText.mockReturnValue("   ");
    const res = mockRes();

    await uploadPdfFile(mockReq({ file: makeFile() }), res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(mockRecordPdfUpload).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith("/tmp/test.pdf");
  });

  it("returns translated text on success", async () => {
    mockBlocksToText
      .mockReturnValueOnce("Hello")
      .mockReturnValueOnce("Bonjour");

    const res = mockRes();

    await uploadPdfFile(
      mockReq({ file: makeFile(), body: { language: "French" } }),
      res,
    );

    expect(mockRecordPdfUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "pdf",
        fieldName: "pdf",
        contentHash: "file-hash",
        reusedExisting: false,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      originalName: "test.pdf",
      targetLanguage: "French",
      extractedText: "Hello",
      translatedText: "Bonjour",
    });
  });
});

describe("uploadPdfFileStream", () => {
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
    mockExtractStructured.mockResolvedValue(blocks);
    mockBlocksToText.mockReturnValue("Hello");
    mockGetOrCreateSourceDocument.mockResolvedValue({ id: 10, textHash: "text-hash" });
    mockFindCachedTranslation.mockResolvedValue(null);
    mockTranslate.mockResolvedValue({
      data: { translatedText: "Bonjour", notes: "ok" },
      tokenCount: 5,
    });
    mockTranslateStream.mockImplementation(
      async (_text: string, _lang: string, onToken: (token: string) => void) => {
        onToken("Bonjour");
        return { tokenCount: 5 };
      },
    );
    mockDelete.mockResolvedValue(undefined);
  });

  it("emits an error event when no file is provided", async () => {
    const res = mockRes();

    await uploadPdfFileStream(mockReq(), res);

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining("event: error"));
    expect(res.end).toHaveBeenCalled();
  });

  it("emits an error event when extracted text is empty", async () => {
    mockBlocksToText.mockReturnValue("   ");
    const res = mockRes();

    await uploadPdfFileStream(mockReq({ file: makeFile() }), res);

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining("event: error"));
    expect(mockDelete).toHaveBeenCalledWith("/tmp/test.pdf");
  });

  it("emits complete on success", async () => {
    mockBlocksToText
      .mockReturnValueOnce("Hello")
      .mockReturnValueOnce("Bonjour");

    const res = mockRes();

    await uploadPdfFileStream(
      mockReq({ file: makeFile(), body: { language: "French" } }),
      res,
    );

    const writes = res.write.mock.calls.map(([value]) => String(value));
    expect(writes.some((value) => value.includes("event: complete"))).toBe(true);
    expect(mockRecordPdfUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "pdf_stream",
        contentHash: "file-hash",
      }),
    );
  });
});
