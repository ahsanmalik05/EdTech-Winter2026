export interface TranslationRequest {
  text: string;
}

export interface TranslationResponse {
  originalLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
}
