import type { Request } from "express";
import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { pdf_uploads } from "../db/schema.js";
import type { LogPdfUploadParams } from "../types/common.js";
import config from "../config/config.js";
import { computeFileHash, isBucketConfigured, uploadToBucket } from "./bucket.js";

export interface ArchiveUploadedPdfParams {
  file: Express.Multer.File;
  flow: string;
  userId: number | null;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown bucket upload error";
}

export async function logPdfUpload(
  params: LogPdfUploadParams,
): Promise<void> {
  try {
    await db.insert(pdf_uploads).values({
      userId: params.userId ?? null,
      flow: params.flow,
      fieldName: params.fieldName,
      originalName: params.originalName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      bucketName: params.bucketName ?? null,
      objectKey: params.objectKey ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      contentHash: params.contentHash ?? null,
      reusedExisting: params.reusedExisting ?? false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log PDF upload:", error);
  }
}

export async function archiveUploadedPdf(
  params: ArchiveUploadedPdfParams,
): Promise<void> {
  const { file, flow, userId } = params;
  const resolvedUserId = userId ?? null;

  if (!isBucketConfigured()) {
    await logPdfUpload({
      userId: resolvedUserId,
      flow,
      fieldName: file.fieldname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucketName: null,
      objectKey: null,
      status: "skipped",
      errorMessage: "Railway bucket configuration is incomplete",
    });
    return;
  }

  try {
    const contentHash = await computeFileHash(file.path);
    const result = await uploadToBucket(file.path, contentHash);

    await logPdfUpload({
      userId: resolvedUserId,
      flow,
      fieldName: file.fieldname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucketName: config.bucket.name || null,
      objectKey: result.objectKey,
      status: "uploaded",
      errorMessage: null,
      contentHash,
      reusedExisting: !result.uploaded,
    });
  } catch (error) {
    const errorMessage = normalizeErrorMessage(error);
    console.error("Failed to archive uploaded PDF:", error);

    await logPdfUpload({
      userId: resolvedUserId,
      flow,
      fieldName: file.fieldname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucketName: null,
      objectKey: null,
      status: "failed",
      errorMessage,
    });
  }
}

export function getRequestUserId(
  req: Request,
): number | null {
  return req.user?.id ?? req.apiKey?.user_id ?? null;
}

export async function findUploadedByHash(
  contentHash: string,
): Promise<{ objectKey: string } | null> {
  const [row] = await db
    .select({ objectKey: pdf_uploads.objectKey })
    .from(pdf_uploads)
    .where(
      and(
        eq(pdf_uploads.contentHash, contentHash),
        eq(pdf_uploads.status, "uploaded"),
        isNotNull(pdf_uploads.objectKey),
      ),
    )
    .limit(1);

  if (row?.objectKey) {
    return { objectKey: row.objectKey };
  }
  return null;
}

export async function recordPdfUpload(params: {
  userId?: number | undefined;
  flow: string;
  fieldName: string;
  contentHash: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bucketName?: string | undefined;
  objectKey?: string | undefined;
  status: "uploaded" | "failed" | "skipped";
  reusedExisting: boolean;
  errorMessage?: string | undefined;
}): Promise<number> {
  const [inserted] = await db
    .insert(pdf_uploads)
    .values({
      userId: params.userId ?? null,
      flow: params.flow,
      fieldName: params.fieldName,
      contentHash: params.contentHash,
      originalName: params.originalName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      bucketName: params.bucketName ?? null,
      objectKey: params.objectKey ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      reusedExisting: params.reusedExisting,
    })
    .returning({ id: pdf_uploads.id });

  return inserted!.id;
}
