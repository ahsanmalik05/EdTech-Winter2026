import { eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { translation_log, source_documents } from "../db/schema.js";
import { computeTextHash } from "./bucket.js";

export async function getOrCreateSourceDocument(
  text: string,
): Promise<{ id: number; textHash: string }> {
  const textHash = computeTextHash(text);

  const [existing] = await db
    .select({ id: source_documents.id, textHash: source_documents.textHash })
    .from(source_documents)
    .where(eq(source_documents.textHash, textHash))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(source_documents)
    .values({ textHash, sourceText: text })
    .onConflictDoNothing({ target: source_documents.textHash })
    .returning({ id: source_documents.id, textHash: source_documents.textHash });

  if (inserted) {
    return inserted;
  }

  const [race] = await db
    .select({ id: source_documents.id, textHash: source_documents.textHash })
    .from(source_documents)
    .where(eq(source_documents.textHash, textHash))
    .limit(1);

  return race!;
}

export interface TranslationCacheKey {
  sourceTextHash: string;
  targetLanguage: string;
  model: string;
  gradeLevel?: string | null;
}

export interface CachedTranslation {
  translatedText: string;
  tokenCount: number | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  costUsd: string | null;
}

export async function findCachedTranslation(
  key: TranslationCacheKey,
): Promise<CachedTranslation | null> {
  const conditions = [
    eq(translation_log.sourceTextHash, key.sourceTextHash),
    eq(translation_log.targetLanguage, key.targetLanguage),
    eq(translation_log.model, key.model),
    isNotNull(translation_log.translatedText),
  ];

  if (key.gradeLevel) {
    conditions.push(eq(translation_log.gradeLevel, key.gradeLevel));
  } else {
    conditions.push(sql`${translation_log.gradeLevel} IS NULL`);
  }

  const [row] = await db
    .select({
      translatedText: translation_log.translatedText,
      tokenCount: translation_log.tokenCount,
      inputTokenCount: translation_log.inputTokenCount,
      outputTokenCount: translation_log.outputTokenCount,
      costUsd: translation_log.costUsd,
    })
    .from(translation_log)
    .where(and(...conditions))
    .orderBy(sql`${translation_log.createdAt} DESC`)
    .limit(1);

  if (row?.translatedText) {
    return {
      translatedText: row.translatedText,
      tokenCount: row.tokenCount,
      inputTokenCount: row.inputTokenCount,
      outputTokenCount: row.outputTokenCount,
      costUsd: row.costUsd,
    };
  }

  return null;
}
