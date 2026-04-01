import {
  count,
  avg,
  sum,
  sql,
  gte,
  lte,
  and,
  isNotNull,
  eq,
} from "drizzle-orm";
import { db } from "../db/index.js";
import { translation_log, languages, templates } from "../db/schema.js";
import type {
  LogTranslationParams,
  TranslationStats,
} from "../types/common.js";
import type { TranslationLog } from "../db/schema.js";

// TODO: Replace with actual model pricing for command-a-translate-08-2025
const TRANSLATION_COST_PER_TOKEN = 0.000001;

async function resolveLanguageName(targetLanguage: string): Promise<string> {
  const trimmed = targetLanguage.trim();
  const [byCode] = await db
    .select({ name: languages.name })
    .from(languages)
    .where(eq(languages.code, trimmed))
    .limit(1);
  if (byCode) return byCode.name;

  const [byName] = await db
    .select({ name: languages.name })
    .from(languages)
    .where(eq(languages.name, trimmed))
    .limit(1);
  if (byName) return byName.name;

  return trimmed;
}

function calculateCost(
  inputTokenCount: number | undefined,
  outputTokenCount: number | undefined,
): number | null {
  const totalTokens = (inputTokenCount ?? 0) + (outputTokenCount ?? 0);
  if (totalTokens === 0) return null;
  return totalTokens * TRANSLATION_COST_PER_TOKEN;
}

export async function logTranslation(
  params: LogTranslationParams,
): Promise<number | null> {
  const resolvedLanguage = await resolveLanguageName(params.targetLanguage);
  const costUsd = calculateCost(
    params.inputTokenCount,
    params.outputTokenCount,
  );
  const [inserted] = await db
    .insert(translation_log)
    .values({
      userId: params.userId,
      sourceText: params.sourceText.trim(),
      translatedText: params.translatedText ?? null,
      sourceLanguage: params.sourceLanguage?.trim() ?? null,
      targetLanguage: resolvedLanguage,
      model: params.model.trim(),
      tokenCount: params.tokenCount ?? null,
      inputTokenCount: params.inputTokenCount ?? null,
      outputTokenCount: params.outputTokenCount ?? null,
      costUsd: costUsd?.toString() ?? null,
      latencyMs: params.latencyMs,
      createdAt: new Date(),
    })
    .returning({ id: translation_log.id });

  return inserted?.id ?? null;
}

function parseAvg(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function fetchTotalCount() {
  const [row] = await db.select({ total: count() }).from(translation_log);
  return row?.total ?? 0;
}

async function fetchTodayCount() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: count() })
    .from(translation_log)
    .where(gte(translation_log.createdAt, todayStart));
  return row?.total ?? 0;
}

async function fetchSuccessCount() {
  const [row] = await db
    .select({ successful: count() })
    .from(translation_log)
    .where(isNotNull(translation_log.translatedText));
  return row?.successful ?? 0;
}

async function fetchByLanguage() {
  const rows = await db
    .select({
      rawLanguage: translation_log.targetLanguage,
      langName: languages.name,
      translations: count(),
    })
    .from(translation_log)
    .leftJoin(
      languages,
      sql`${translation_log.targetLanguage} = ${languages.code} OR ${translation_log.targetLanguage} = ${languages.name}`,
    )
    .groupBy(translation_log.targetLanguage, languages.name)
    .orderBy(sql`count(*) desc`);

  const merged = new Map<string, number>();
  for (const r of rows) {
    const name = r.langName ?? r.rawLanguage;
    merged.set(name, (merged.get(name) ?? 0) + r.translations);
  }
  return Array.from(merged, ([language, translations]) => ({
    language,
    translations,
  })).sort((a, b) => b.translations - a.translations);
}

async function fetchByModel() {
  return db
    .select({ model: translation_log.model, translations: count() })
    .from(translation_log)
    .groupBy(translation_log.model)
    .orderBy(sql`count(*) desc`);
}

async function fetchAverageLatency() {
  const [row] = await db
    .select({ avgLatencyMs: avg(translation_log.latencyMs) })
    .from(translation_log);
  return parseAvg(row?.avgLatencyMs);
}

async function fetchTokenStats() {
  const [[totalRow], [avgRow]] = await Promise.all([
    db.select({ total: sum(translation_log.tokenCount) }).from(translation_log),
    db.select({ avg: avg(translation_log.tokenCount) }).from(translation_log),
  ]);
  const total = totalRow?.total;
  return {
    totalTokensUsed:
      total !== null && total !== undefined ? Number(total) : null,
    averageTokensPerTranslation: parseAvg(avgRow?.avg as string | null),
  };
}

async function fetchTokensByLanguage() {
  const rows = await db
    .select({
      rawLanguage: translation_log.targetLanguage,
      langName: languages.name,
      totalTokens: sum(translation_log.tokenCount),
    })
    .from(translation_log)
    .leftJoin(
      languages,
      sql`${translation_log.targetLanguage} = ${languages.code} OR ${translation_log.targetLanguage} = ${languages.name}`,
    )
    .groupBy(translation_log.targetLanguage, languages.name)
    .orderBy(sql`sum(token_count) desc`);

  const merged = new Map<string, number>();
  for (const r of rows) {
    const name = r.langName ?? r.rawLanguage;
    const tokens =
      r.totalTokens !== null && r.totalTokens !== undefined
        ? Number(r.totalTokens)
        : 0;
    merged.set(name, (merged.get(name) ?? 0) + tokens);
  }
  return Array.from(merged, ([language, totalTokens]) => ({
    language,
    totalTokens,
  })).sort((a, b) => b.totalTokens - a.totalTokens);
}

async function fetchTopUsers() {
  return db
    .select({ userId: translation_log.userId, translations: count() })
    .from(translation_log)
    .groupBy(translation_log.userId)
    .orderBy(sql`count(*) desc`)
    .limit(10);
}

async function fetchCostStats() {
  const [row] = await db
    .select({ totalCost: sum(translation_log.costUsd) })
    .from(translation_log);
  const raw = row?.totalCost;
  const totalCostUsd = raw !== null && raw !== undefined ? Number(raw) : null;
  return {
    totalCostUsd: totalCostUsd && totalCostUsd > 0 ? totalCostUsd : null,
  };
}

async function fetchWorksheetStats() {
  const [totalRow] = await db.select({ total: count() }).from(templates);
  const totalGenerated = totalRow?.total ?? 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ total: count() })
    .from(templates)
    .where(gte(templates.createdAt, todayStart));
  const generatedToday = todayRow?.total ?? 0;

  const bySubject = await db
    .select({ subject: templates.subject, count: count() })
    .from(templates)
    .groupBy(templates.subject)
    .orderBy(sql`count(*) desc`);

  const byGradeLevel = await db
    .select({ gradeLevel: templates.gradeLevel, count: count() })
    .from(templates)
    .groupBy(templates.gradeLevel)
    .orderBy(sql`count(*) desc`);

  return { totalGenerated, generatedToday, bySubject, byGradeLevel };
}

export async function getTranslationStatsFromDb(): Promise<TranslationStats> {
  const [
    total,
    translationsToday,
    successful,
    byLanguage,
    byModel,
    averageLatencyMs,
    tokenStats,
    tokensByLanguage,
    topUsers,
    worksheetStats,
    costStats,
  ] = await Promise.all([
    fetchTotalCount(),
    fetchTodayCount(),
    fetchSuccessCount(),
    fetchByLanguage(),
    fetchByModel(),
    fetchAverageLatency(),
    fetchTokenStats(),
    fetchTokensByLanguage(),
    fetchTopUsers(),
    fetchWorksheetStats(),
    fetchCostStats(),
  ]);

  return {
    totalTranslations: total,
    translationsToday,
    successRate:
      total > 0 ? Math.round((successful / total) * 10000) / 100 : null,
    byLanguage,
    byModel,
    averageLatencyMs: total > 0 ? averageLatencyMs : null,
    ...tokenStats,
    tokensByLanguage,
    topUsers,
    cacheHitRate: null,
    worksheetStats,
    ...costStats,
  };
}

export async function getLogsByDateRange(
  from: Date,
  to: Date,
  userId?: number,
): Promise<TranslationLog[]> {
  const conditions = [
    gte(translation_log.createdAt, from),
    lte(translation_log.createdAt, to),
  ];
  if (userId !== undefined) {
    conditions.push(eq(translation_log.userId, userId));
  }
  return db
    .select()
    .from(translation_log)
    .where(and(...conditions))
    .orderBy(translation_log.createdAt)
    .execute();
}
