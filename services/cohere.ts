import { generateText, streamText, Output } from "ai";
import { cohere } from "@ai-sdk/cohere";
import { z } from "zod";
import config from "../config/config.js";
import { matchTerms, buildGlossaryPrompt } from "./glossary.js";
import { TRANSLATION_SYSTEM, TRANSLATION_STREAM_SYSTEM } from "./prompts/system.js";

const translationSchema = z.object({
  translatedText: z.string(),
  notes: z.string(),
});

export type TranslationOutput = z.infer<typeof translationSchema>;

export type TranslateResult = {
  data: TranslationOutput | null;
  tokenCount: number | null;
};

export async function translateContent(
  content: string,
  targetLanguage: string,
  model: string = config.models.translation,
): Promise<TranslateResult> {
  const matched = matchTerms(content);
  const glossaryBlock = buildGlossaryPrompt(matched);
  const systemPrompt = `${TRANSLATION_SYSTEM}\n\n${glossaryBlock}`.trim();
  const prompt = `Translate the following into ${targetLanguage}:\n\n${content}`;

  try {
    const { output, usage } = await generateText({
      model: cohere(model),
      output: Output.object({
        schema: translationSchema,
      }),
      system: systemPrompt,
      prompt,
    });

    const tokenCount =
      usage && usage.inputTokens !== undefined && usage.outputTokens !== undefined
        ? usage.inputTokens + usage.outputTokens
        : null;

    return { data: output, tokenCount };
  } catch (error) {
    console.error("Cohere translation failed:", error);
    return { data: null, tokenCount: null };
  }
}

export async function translateContentStream(
  content: string,
  targetLanguage: string,
  onToken: (token: string) => void,
  model: string = config.models.translation,
): Promise<{ tokenCount: number | null }> {
  const matched = matchTerms(content);
  const glossaryBlock = buildGlossaryPrompt(matched);

  const systemPrompt = `${TRANSLATION_STREAM_SYSTEM}\n\n${glossaryBlock}`.trim();
  const prompt = `Translate the following into ${targetLanguage}:\n\n${content}`;

  try {
    const { textStream, usage } = await streamText({
      model: cohere(model),
      system: systemPrompt,
      prompt,
    });

    for await (const token of textStream) {
      onToken(token);
    }

    const finalUsage = await usage;
    const tokenCount =
      finalUsage && finalUsage.inputTokens !== undefined && finalUsage.outputTokens !== undefined
        ? finalUsage.inputTokens + finalUsage.outputTokens
        : null;

    return { tokenCount };
  } catch (error) {
    console.error("Cohere stream translation failed:", error);
    return { tokenCount: null };
  }
}

export async function translateBatch(
  items: { id: string; text: string }[],
  targetLanguage: string,
  gradeLevel?: string,
  model: string = config.models.translation,
): Promise<
  Record<
    string,
    {
      data: TranslationOutput | null;
      tokenCount?: number | null;
      inputTokenCount?: number | null;
      outputTokenCount?: number | null;
      error?: string;
    }
  >
> {
  const buildPrompt = (text: string) => {
    const gradeLevelInstruction = gradeLevel
      ? ` Use vocabulary and sentence structure appropriate for ${gradeLevel} students.`
      : "";
    return `You are a professional translator. Translate the following content into ${targetLanguage}. Maintain the same structure, formatting, and tone.${gradeLevelInstruction} Return a JSON object with "translatedText" (the full translation) and "notes" (brief translator notes about cultural adaptations or tricky translation decisions).\n\nCONTENT TO TRANSLATE:\n\n${text}`;
  };

  const promises = items.map(async (item) => {
    const prompt = buildPrompt(item.text);
    try {
      const { output, usage } = await generateText({
        model: cohere(model),
        output: Output.object({
          schema: translationSchema,
        }),
        system: TRANSLATION_SYSTEM,
        prompt,
      });

      const inputTokenCount = usage?.inputTokens ?? null;
      const outputTokenCount = usage?.outputTokens ?? null;
      const tokenCount =
        inputTokenCount !== null && outputTokenCount !== null
          ? inputTokenCount + outputTokenCount
          : null;

      return {
        id: item.id,
        data: output,
        tokenCount,
        inputTokenCount,
        outputTokenCount,
      };
    } catch (error) {
      return {
        id: item.id,
        data: null,
        tokenCount: null,
        inputTokenCount: null,
        outputTokenCount: null,
        error: error instanceof Error ? error.message : "Translation failed",
      };
    }
  });

  const settled = await Promise.allSettled(promises);

  const results: Record<
    string,
    {
      data: TranslationOutput | null;
      tokenCount?: number | null;
      inputTokenCount?: number | null;
      outputTokenCount?: number | null;
      error?: string;
    }
  > = {};

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const item = items[i]!;
    if (result.status === "fulfilled") {
      results[result.value.id] = {
        data: result.value.data,
        tokenCount: result.value.tokenCount,
        inputTokenCount: result.value.inputTokenCount,
        outputTokenCount: result.value.outputTokenCount,
      };
    } else {
      results[item.id] = {
        data: null,
        tokenCount: null,
        inputTokenCount: null,
        outputTokenCount: null,
        error: result.reason?.message || "Translation failed",
      };
    }
  }

  return results;
}

export async function embed(
  texts: string[],
  inputType:
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering" = "search_document",
  model: string = "embed-english-v3.0",
) {
  // Note: Vercel AI SDK doesn't have a direct embed function for Cohere yet
  // Falling back to direct fetch for embeddings
  const response = await fetch("https://api.cohere.com/v2/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      texts,
      model,
      input_type: inputType,
      embedding_types: ["float"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Cohere embed API error: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings;
}

// Legacy export for compatibility
export { cohere };
export default cohere;
