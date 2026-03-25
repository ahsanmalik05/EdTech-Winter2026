export interface Language {
    id: number;
    name: string;
    code: string;
}

export interface LogTranslationParams {
    userId: number;
    sourceText: string;
    translatedText: string | undefined;
    targetLanguage: string;
    model: string;
    tokenCount: number | undefined;
    latencyMs: number;
}

export interface TranslationStats {
    totalTranslations: number;
    translationsToday: number;
    successRate: number | null;
    byLanguage: { language: string; translations: number }[];
    byModel: { model: string; translations: number }[];
    averageLatencyMs: number | null;
    totalTokensUsed: number | null;
    averageTokensPerTranslation: number | null;
    tokensByLanguage: { language: string; totalTokens: number }[];
    topUsers: { userId: number; translations: number }[];
    cacheHitRate: null;
}
