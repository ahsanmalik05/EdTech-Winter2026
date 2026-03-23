export interface Language {
    id: number;
    name: string;
    code: string;
}

export interface TranslationLogEntry {
    id: number;
    sourceText: string;
    translatedText: string;
    sourceLanguageId: number;
    targetLanguageId: number;
    createdAt: Date;
}
