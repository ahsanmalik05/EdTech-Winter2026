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
import { translation_log, languages, templates, template_generation_log } from "../db/schema.js";
import type {
  LogTranslationParams,
  TranslationStats,
} from "../types/common.js";
import type { TranslationLog } from "../db/schema.js";
import { calculateCost } from "../utils/cost.js";

const STATS_CACHE_MS = 15_000;

let translationStatsCache:
  | { value: TranslationStats; expiresAt: number }
  | null = null;
let translationStatsInFlight: Promise<TranslationStats> | null = null;

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



export async function logTranslation(
  params: LogTranslationParams,
): Promise<number | null> {
  const resolvedLanguage = await resolveLanguageName(params.targetLanguage);
  const costUsd = calculateCost(
    params.model,
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
      sourceTextHash: params.sourceTextHash ?? null,
      sourceDocumentId: params.sourceDocumentId ?? null,
      gradeLevel: params.gradeLevel ?? null,
      cached: params.cached ?? false,
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
    .select({ totalCost: sql<string>`COALESCE(SUM(${translation_log.costUsd}), 0)` })
    .from(translation_log);
  return {
    totalCostUsd: Number(row?.totalCost ?? 0),
  };
}

async function fetchGenCostStats() {
  const [row] = await db
    .select({ totalCost: sql<string>`COALESCE(SUM(${template_generation_log.costUsd}), 0)` })
    .from(template_generation_log);
  return { totalGenCostUsd: Number(row?.totalCost ?? 0) };
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
    .select({
      subject: sql<string>`MAX(${templates.subject})`,
      count: count(),
    })
    .from(templates)
    .groupBy(sql`LOWER(${templates.subject})`)
    .orderBy(sql`count(*) desc`);

  const byGradeLevel = await db
    .select({
      gradeLevel: sql<string>`MAX(${templates.gradeLevel})`,
      count: count(),
    })
    .from(templates)
    .groupBy(sql`LOWER(${templates.gradeLevel})`)
    .orderBy(sql`count(*) desc`);

  return { totalGenerated, generatedToday, bySubject, byGradeLevel };
}

async function fetchTemplatesByDay() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  return db
    .select({
      date: sql<string>`TO_CHAR(${templates.createdAt}, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(templates)
    .where(gte(templates.createdAt, thirtyDaysAgo))
    .groupBy(sql`TO_CHAR(${templates.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${templates.createdAt}, 'YYYY-MM-DD')`);
}

async function fetchTopSubjectTopicPairs() {
  return db
    .select({
      subject: sql<string>`MAX(${templates.subject})`,
      topic: sql<string>`MAX(${templates.topic})`,
      count: count(),
    })
    .from(templates)
    .groupBy(sql`LOWER(${templates.subject})`, sql`LOWER(${templates.topic})`)
    .orderBy(sql`count(*) desc`)
    .limit(10);
}

async function fetchTemplatesPerUser() {
  const rows = await db
    .select({
      userId: templates.createdByUserId,
      count: count(),
    })
    .from(templates)
    .where(isNotNull(templates.createdByUserId))
    .groupBy(templates.createdByUserId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const [avgRow] = await db
    .select({
      avg: avg(sql<number>`sub.cnt`),
    })
    .from(
      sql`(SELECT COUNT(*) as cnt FROM templates WHERE created_by_user_id IS NOT NULL GROUP BY created_by_user_id) as sub`,
    );

  return {
    topCreators: rows.map((r) => ({ userId: r.userId!, count: r.count })),
    averagePerUser: parseAvg(avgRow?.avg as string | null),
  };
}

async function fetchGradeLevelBySubject() {
  const rows = await db
    .select({
      subject: sql<string>`MAX(${templates.subject})`,
      gradeLevel: sql<string>`MAX(${templates.gradeLevel})`,
      count: count(),
    })
    .from(templates)
    .groupBy(
      sql`LOWER(${templates.subject})`,
      sql`LOWER(${templates.gradeLevel})`,
    )
    .orderBy(sql`LOWER(${templates.subject})`, sql`count(*) desc`);

  const grouped: Record<string, { gradeLevel: string; count: number }[]> = {};
  for (const r of rows) {
    if (!grouped[r.subject]) grouped[r.subject] = [];
    grouped[r.subject]!.push({ gradeLevel: r.gradeLevel, count: r.count });
  }
  return Object.entries(grouped).map(([subject, grades]) => ({
    subject,
    grades,
  }));
}

async function fetchCacheHitRate(): Promise<number | null> {
  const [totalRow] = await db.select({ total: count() }).from(translation_log);
  const [cachedRow] = await db
    .select({ cached: count() })
    .from(translation_log)
    .where(eq(translation_log.cached, true));
  const total = totalRow?.total ?? 0;
  const cached = cachedRow?.cached ?? 0;
  if (total === 0) return null;
  return Math.round((cached / total) * 10000) / 100;
}

export async function getTranslationStatsFromDb(): Promise<TranslationStats> {
  if (translationStatsCache && translationStatsCache.expiresAt > Date.now()) {
    return translationStatsCache.value;
  }

  if (translationStatsInFlight) {
    return translationStatsInFlight;
  }

  translationStatsInFlight = (async () => {
    const total = await fetchTotalCount();
    const translationsToday = await fetchTodayCount();
    const successful = await fetchSuccessCount();
    const byLanguage = await fetchByLanguage();
    const byModel = await fetchByModel();
    const averageLatencyMs = await fetchAverageLatency();
    const tokenStats = await fetchTokenStats();
    const tokensByLanguage = await fetchTokensByLanguage();
    const topUsers = await fetchTopUsers();
    const worksheetStats = await fetchWorksheetStats();
    const costStats = await fetchCostStats();
    const genCostStats = await fetchGenCostStats();
    const templatesByDay = await fetchTemplatesByDay();
    const topSubjectTopicPairs = await fetchTopSubjectTopicPairs();
    const templatesPerUser = await fetchTemplatesPerUser();
    const gradeLevelBySubject = await fetchGradeLevelBySubject();
    const cacheHitRate = await fetchCacheHitRate();

    const stats: TranslationStats = {
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
      cacheHitRate,
      worksheetStats,
      ...costStats,
      ...genCostStats,
      templatesByDay,
      topSubjectTopicPairs,
      templatesPerUser,
      gradeLevelBySubject,
    };

    translationStatsCache = {
      value: stats,
      expiresAt: Date.now() + STATS_CACHE_MS,
    };

    return stats;
  })();

  try {
    return await translationStatsInFlight;
  } finally {
    translationStatsInFlight = null;
  }
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
