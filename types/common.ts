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
