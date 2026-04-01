import type { Request } from "express";
import { db } from "../db/index.js";
import { pdf_uploads } from "../db/schema.js";
import type { LogPdfUploadParams } from "../types/common.js";
import {
  isBucketConfigured,
  uploadFileToBucket,
} from "./bucket.js";

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
    const result = await uploadFileToBucket({
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      flow,
    });

    await logPdfUpload({
      userId: resolvedUserId,
      flow,
      fieldName: file.fieldname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucketName: result.bucketName,
      objectKey: result.objectKey,
      status: "uploaded",
      errorMessage: null,
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
