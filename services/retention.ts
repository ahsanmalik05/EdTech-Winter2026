import { and, eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { pdf_uploads } from "../db/schema.js";

export async function purgeFailedUploads(retentionDays: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const deleted = await db
    .delete(pdf_uploads)
    .where(
      and(
        eq(pdf_uploads.status, "failed"),
        lt(pdf_uploads.createdAt, cutoff),
      ),
    )
    .returning({ id: pdf_uploads.id });

  const skipped = await db
    .delete(pdf_uploads)
    .where(
      and(
        eq(pdf_uploads.status, "skipped"),
        lt(pdf_uploads.createdAt, cutoff),
      ),
    )
    .returning({ id: pdf_uploads.id });

  return deleted.length + skipped.length;
}
