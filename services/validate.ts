import { translateContent } from './cohere.js';
import { scoreSimilarity } from './openai.js';

export interface StructuralChecks {
  sectionCountMatch: boolean;
  originalSectionCount: number;
  translatedSectionCount: number;
  headersIntact: boolean;
}

export interface ValidationResult {
  backTranslated: string;
  similarityScore: number | null;
  similarityReasoning: string | null;
  structuralChecks: StructuralChecks;
  overallConfidence: number;
}

export async function backTranslate(
  translatedText: string,
  sourceLanguage: string = 'English'
): Promise<string> {
  const prompt = `Translate the following ${sourceLanguage} text back to English. Return JSON with "translatedText" (the back-translation) and "notes" (brief notes about the translation).

TEXT TO TRANSLATE:
${translatedText}`;

  const result = await translateContent(prompt, sourceLanguage);
  return result.data?.translatedText ?? translatedText;
}

export function checkStructure(
  original: string,
  translated: string
): StructuralChecks {
  const countSections = (text: string) =>
    text.split(/\n{2,}/).filter(s => s.trim().length > 0).length;

  const extractHeaders = (text: string) =>
    text.split('\n').filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        trimmed.length < 80 &&
        !trimmed.endsWith('.')
      );
    });

  const originalSectionCount = countSections(original);
  const translatedSectionCount = countSections(translated);
  const originalHeaders = extractHeaders(original);
  const translatedHeaders = extractHeaders(translated);

  return {
    sectionCountMatch: originalSectionCount === translatedSectionCount,
    originalSectionCount,
    translatedSectionCount,
    headersIntact: translatedHeaders.length >= originalHeaders.length,
  };
}

export async function validateTranslation(
  original: string,
  translated: string,
  targetLanguage: string,
): Promise<ValidationResult> {
  // Back-translation and structural check can run in parallel
  const backTranslated = await backTranslate(translated, targetLanguage);
  const structuralChecks = checkStructure(original, translated);

  // Score how similar the back-translation is to the original
  const similarityResult = await scoreSimilarity(original, backTranslated);

  // Build overall confidence combining LLM score + structural signals
  let overallConfidence: number;
  if (similarityResult !== null) {
    const structureBonus =
      structuralChecks.sectionCountMatch && structuralChecks.headersIntact
        ? 0.05
        : -0.05;
    overallConfidence = Math.min(
      1,
      Math.max(0, similarityResult.score + structureBonus)
    );
  } else {
    // Fallback if LLM scoring failed entirely
    overallConfidence =
      structuralChecks.sectionCountMatch && structuralChecks.headersIntact
        ? 0.7
        : 0.4;
  }

  return {
    backTranslated,
    similarityScore: similarityResult?.score ?? null,
    similarityReasoning: similarityResult?.reasoning ?? null,
    structuralChecks,
    overallConfidence,
  };
}