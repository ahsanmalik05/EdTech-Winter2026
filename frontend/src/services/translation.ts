const API_URL = "http://localhost:3000";

export interface TranslationResult {
  originalLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  /** COMET reference-free quality score in [0, 1]. Higher is better. */
  confidence: number;
  /** True when confidence < 0.75 — frontend should warn the user. */
  lowConfidence: boolean;
}

async function translateText(text: string): Promise<TranslationResult> {
  const response = await fetch(
    `${API_URL}/translation?text=${encodeURIComponent(text)}`
  );
  if (!response.ok) {
    throw new Error(`Translation API error: ${response.statusText}`);
  }
  const data: TranslationResult = await response.json();
  return data;
}

export { translateText };