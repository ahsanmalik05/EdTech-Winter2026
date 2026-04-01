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
    worksheetStats: {
        totalGenerated: number;
        generatedToday: number;
        bySubject: { subject: string; count: number }[];
        byGradeLevel: { gradeLevel: string; count: number }[];
    };
    templatesByDay: { date: string; count: number }[];
    topSubjectTopicPairs: { subject: string; topic: string; count: number }[];
    templatesPerUser: {
        topCreators: { userId: number; count: number }[];
        averagePerUser: number | null;
    };
    gradeLevelBySubject: {
        subject: string;
        grades: { gradeLevel: string; count: number }[];
    }[];
}

export interface LogTemplateGenerationParams {
    templateId?: number;
    userId?: number;
    subject: string;
    topic: string;
    gradeLevel: string;
    model: string;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
}
