import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { pdf_uploads } from "../db/schema.js";

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
  contentHash: string;
  originalName?: string | undefined;
  objectKey?: string | undefined;
  fileSizeBytes?: number | undefined;
  status: "uploaded" | "failed" | "skipped";
  reusedExisting: boolean;
}): Promise<number> {
  const [inserted] = await db
    .insert(pdf_uploads)
    .values({
      userId: params.userId ?? null,
      contentHash: params.contentHash,
      originalName: params.originalName ?? null,
      objectKey: params.objectKey ?? null,
      fileSizeBytes: params.fileSizeBytes ?? null,
      status: params.status,
      reusedExisting: params.reusedExisting,
    })
    .returning({ id: pdf_uploads.id });

  return inserted!.id;
}
