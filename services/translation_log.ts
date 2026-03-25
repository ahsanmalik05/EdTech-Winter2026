import { count, avg, sum, sql, gte, lte, and, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { translation_log } from "../db/schema.js";
import type { LogTranslationParams, TranslationStats } from "../types/common.js";
import type { TranslationLog } from "../db/schema.js";

export async function logTranslation(params: LogTranslationParams): Promise<void> {
    await (db.insert(translation_log).values({
        userId: params.userId,
        sourceText: params.sourceText.trim(),
        translatedText: params.translatedText ?? null,
        targetLanguage: params.targetLanguage.trim(),
        model: params.model.trim(),
        tokenCount: params.tokenCount ?? null,
        latencyMs: params.latencyMs,
        createdAt: new Date(),
    }) as any).execute();
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
    const [row] = await db.select({ total: count() }).from(translation_log)
        .where(gte(translation_log.createdAt, todayStart));
    return row?.total ?? 0;
}

async function fetchSuccessCount() {
    const [row] = await db.select({ successful: count() }).from(translation_log)
        .where(isNotNull(translation_log.translatedText));
    return row?.successful ?? 0;
}

async function fetchByLanguage() {
    return db.select({ language: translation_log.targetLanguage, translations: count() })
        .from(translation_log)
        .groupBy(translation_log.targetLanguage)
        .orderBy(sql`count(*) desc`);
}

async function fetchByModel() {
    return db.select({ model: translation_log.model, translations: count() })
        .from(translation_log)
        .groupBy(translation_log.model)
        .orderBy(sql`count(*) desc`);
}

async function fetchAverageLatency() {
    const [row] = await db.select({ avgLatencyMs: avg(translation_log.latencyMs) }).from(translation_log);
    return parseAvg(row?.avgLatencyMs);
}

async function fetchTokenStats() {
    const [[totalRow], [avgRow]] = await Promise.all([
        db.select({ total: sum(translation_log.tokenCount) }).from(translation_log),
        db.select({ avg: avg(translation_log.tokenCount) }).from(translation_log),
    ]);
    const total = totalRow?.total;
    return {
        totalTokensUsed: total !== null && total !== undefined ? Number(total) : null,
        averageTokensPerTranslation: parseAvg(avgRow?.avg as string | null),
    };
}

async function fetchTokensByLanguage() {
    const rows = await db.select({
            language: translation_log.targetLanguage,
            totalTokens: sum(translation_log.tokenCount),
        })
        .from(translation_log)
        .groupBy(translation_log.targetLanguage)
        .orderBy(sql`sum(token_count) desc`);
    return rows.map((r) => ({
        language: r.language,
        totalTokens: r.totalTokens !== null && r.totalTokens !== undefined ? Number(r.totalTokens) : 0,
    }));
}

async function fetchTopUsers() {
    return db.select({ userId: translation_log.userId, translations: count() })
        .from(translation_log)
        .groupBy(translation_log.userId)
        .orderBy(sql`count(*) desc`)
        .limit(10);
}

export async function getTranslationStatsFromDb(): Promise<TranslationStats> {
    const [total, translationsToday, successful, byLanguage, byModel, averageLatencyMs, tokenStats, tokensByLanguage, topUsers] =
        await Promise.all([
            fetchTotalCount(),
            fetchTodayCount(),
            fetchSuccessCount(),
            fetchByLanguage(),
            fetchByModel(),
            fetchAverageLatency(),
            fetchTokenStats(),
            fetchTokensByLanguage(),
            fetchTopUsers(),
        ]);

    return {
        totalTranslations: total,
        translationsToday,
        successRate: total > 0 ? Math.round((successful / total) * 10000) / 100 : null,
        byLanguage,
        byModel,
        averageLatencyMs: total > 0 ? averageLatencyMs : null,
        ...tokenStats,
        tokensByLanguage,
        topUsers,
        cacheHitRate: null,
    };
}

export async function getLogsByDateRange(from: Date, to: Date): Promise<TranslationLog[]> {
    return db
        .select()
        .from(translation_log)
        .where(and(gte(translation_log.createdAt, from), lte(translation_log.createdAt, to)))
        .orderBy(translation_log.createdAt)
        .execute();
}

