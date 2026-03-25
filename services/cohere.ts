import { CohereClientV2 } from 'cohere-ai';
import OpenAI from 'openai';
import config from '../config/config.js';
import { matchTerms, buildGlossaryPrompt } from './glossary.js';

const cohere = new CohereClientV2({
  token: config.cohereApiKey,
});

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

async function chatWithFallback(prompt: string, model: string) {
  try {
    const response = await cohere.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.message?.content?.[0]?.type === 'text') {
      return response.message.content[0].text;
    }
  } catch (error) {
    console.error('Cohere chat failed, falling back to OpenAI:', error);
  }

  const fallback = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
  });

  return fallback.output_text || null;
}

export async function chat(message: string, model: string = 'command-a-03-2025') {
  return chatWithFallback(message, model);
}

export async function chatStream(
  message: string,
  onToken: (token: string) => void,
  model: string = 'command-a-03-2025'
) {
  const stream = await cohere.chatStream({
    model,
    messages: [{ role: 'user', content: message }],
  });

  for await (const event of stream) {
    if (event.type === 'content-delta' && event.delta?.message?.content?.text) {
      onToken(event.delta.message.content.text);
    }
  }
}

export async function embed(
  texts: string[],
  inputType: 'search_document' | 'search_query' | 'classification' | 'clustering' = 'search_document',
  model: string = 'embed-english-v3.0'
) {
  const response = await cohere.embed({
    texts,
    model,
    inputType,
    embeddingTypes: ['float'],
  });

  return response.embeddings;
}

export async function translateContent(
  content: string,
  targetLanguage: string,
  model: string = 'command-a-03-2025'
) {
  const matched = matchTerms(content);
  const glossaryBlock = buildGlossaryPrompt(matched);

  const systemPrompt = `You are an expert educational content translator. Your task is to translate educational material while preserving pedagogical meaning and cultural relevance.

CRITICAL RULES:
- Translate for MEANING, not word-for-word. Adapt analogies, idioms, and culturally-specific references to equivalents that resonate in the target culture and region.
- For abbreviations/acronyms: use the target language and region's established equivalent if one exists. If none exists, keep the original with a brief inline explanation on first use.
- Maintain the same educational register and tone.
- Preserve all formatting, structure, and markup.
- Provide ONLY the translated text without any explanations or commentary.

${glossaryBlock}`.trim();

  const prompt = `${systemPrompt}\n\nTranslate the following into ${targetLanguage}:\n\n${content}`;
  return chatWithFallback(prompt, model);
}

export async function translateContentStream(
  content: string,
  targetLanguage: string,
  onToken: (token: string) => void,
  model: string = 'command-a-03-2025'
) {
  const matched = matchTerms(content);
  const glossaryBlock = buildGlossaryPrompt(matched);

  const systemPrompt = `You are an expert educational content translator. Your task is to translate educational material while preserving pedagogical meaning and cultural relevance.

CRITICAL RULES:
- Translate for MEANING, not word-for-word. Adapt analogies, idioms, and culturally-specific references to equivalents that resonate in the target culture and region.
- For abbreviations/acronyms: use the target language and region's established equivalent if one exists. If none exists, keep the original with a brief inline explanation on first use.
- Maintain the same educational register and tone.
- Preserve all formatting, structure, and markup.
- Provide ONLY the translated text without any explanations or commentary.

${glossaryBlock}`.trim();

  const stream = await cohere.chatStream({
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Translate the following into ${targetLanguage}:\n\n${content}`,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content-delta' && event.delta?.message?.content?.text) {
      onToken(event.delta.message.content.text);
    }
  }
}

export async function translateBatch(
  items: { id: string; text: string }[],
  targetLanguage: string,
  gradeLevel?: string,
  model: string = 'command-a-03-2025'
): Promise<Record<string, { translatedText: string | null; tokenCount: number | null; error?: string }>> {
  const buildPrompt = (text: string) => {
    const gradeLevelInstruction = gradeLevel
      ? ` Use vocabulary and sentence structure appropriate for ${gradeLevel} students.`
      : '';
    return `You are a professional translator. Translate the following content into ${targetLanguage}. Maintain the same structure, formatting, and tone.${gradeLevelInstruction} Provide ONLY the translated text without any explanations.\n\nCONTENT TO TRANSLATE:\n\n${text}`;
  };

  const promises = items.map(async (item) => {
    const prompt = buildPrompt(item.text);
    const response = await cohere.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    const translatedText =
      response.message?.content?.[0]?.type === 'text'
        ? response.message.content[0].text
        : null;
    const tokenCount =
      (response.usage?.tokens?.inputTokens ?? 0) +
      (response.usage?.tokens?.outputTokens ?? 0) || null;
    return { id: item.id, translatedText, tokenCount };
  });

  const settled = await Promise.allSettled(promises);

  const results: Record<string, { translatedText: string | null; tokenCount: number | null; error?: string }> = {};
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const item = items[i]!;
    if (result.status === 'fulfilled') {
      results[result.value.id] = { translatedText: result.value.translatedText, tokenCount: result.value.tokenCount };
    } else {
      results[item.id] = {
        translatedText: null,
        tokenCount: null,
        error: result.reason?.message || 'Translation failed',
      };
    }
  }

  return results;
}

export { cohere };
export default cohere;
