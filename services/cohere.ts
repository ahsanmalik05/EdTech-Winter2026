import { CohereClientV2 } from 'cohere-ai';
import config from '../config/config.js';

// Initialize the Cohere client
const cohere = new CohereClientV2({
  token: config.cohereApiKey,
});

/**
 * Generate a chat response using Cohere's Command model
 * @param message - The user message to send
 * @param model - The model to use (default: command-a-03-2025)
 * @returns The assistant's response text
 */
export async function chat(message: string, model: string = 'command-a-03-2025') {
  const response = await cohere.chat({
    model,
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
}

/**
 * Generate a chat response with streaming
 * @param message - The user message to send
 * @param onToken - Callback function called for each token
 * @param model - The model to use (default: command-a-03-2025)
 */
export async function chatStream(
  message: string, 
  onToken: (token: string) => void,
  model: string = 'command-a-03-2025'
) {
  const stream = await cohere.chatStream({
    model,
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content-delta' && event.delta?.message?.content?.text) {
      onToken(event.delta.message.content.text);
    }
  }
}

/**
 * Generate embeddings for text
 * @param texts - Array of texts to embed
 * @param inputType - The type of input (search_document, search_query, classification, clustering)
 * @param model - The model to use (default: embed-english-v3.0)
 * @returns The embeddings
 */
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

// Self-Assessment educational content
const SELF_ASSESSMENT_CONTENT = `I`;

/**
 * Translate text to French
 * @param text - The text to translate
 * @param model - The model to use (default: command-a-03-2025)
 * @returns The translated content in French
 */
export async function translateToFrench(
  text: string,
  model: string = 'command-a-03-2025'
) {
  const prompt = `You are a professional translator. Translate the following text into French. Provide ONLY the French translation, nothing else.

Text to translate:
${text}`;

  const response = await cohere.chat({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
}

/**
 * Translate any custom content to another language
 * @param content - The content to translate
 * @param targetLanguage - The language to translate to
 * @param model - The model to use (default: command-a-03-2025)
 * @returns The translated content
 */
export async function translateContent(
  content: string,
  targetLanguage: string,
  model: string = 'command-a-03-2025'
) {
  const prompt = `You are a professional translator. Translate the following content into ${targetLanguage}. Maintain the same structure, formatting, and tone. Provide ONLY the translated text without any explanations.

CONTENT TO TRANSLATE:

${content}`;

  const response = await cohere.chat({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
}

/**
 * Reference-free COMET-style quality estimator.
 * Prompts the LLM to score its own translation on a 0–1 scale
 * (analogous to wmt22-cometkiwi-da QE mode, but running in-process).
 *
 * @param sourceText      - Original text before translation
 * @param translatedText  - The produced translation
 * @param sourceLang      - Source language name (e.g. "English")
 * @param targetLang      - Target language name (e.g. "French")
 * @param model           - Cohere model to use
 * @returns score in [0, 1]
 */
export async function scoreCOMET(
  sourceText: string,
  translatedText: string,
  sourceLang: string = 'English',
  targetLang: string = 'French',
  model: string = 'command-a-03-2025'
): Promise<number> {
  const prompt = `You are an expert translation quality evaluator using the COMET reference-free (quality estimation) methodology.

Evaluate the following translation from ${sourceLang} to ${targetLang} on a scale from 0.0 to 1.0, where:
- 1.0 = perfect, fluent, and meaning-preserving
- 0.75–0.99 = good quality with minor issues
- 0.50–0.74 = acceptable but with noticeable errors
- 0.25–0.49 = poor quality, significant meaning loss
- 0.0–0.24 = very poor or completely wrong

SOURCE (${sourceLang}):
${sourceText}

TRANSLATION (${targetLang}):
${translatedText}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"score": <number between 0.0 and 1.0>}`;

  const response = await cohere.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.message?.content?.[0]?.type === 'text'
    ? response.message.content[0].text.trim()
    : '{"score": 0.5}';

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const score = Number(parsed.score);
    // Clamp to [0, 1]
    return Math.min(1, Math.max(0, isNaN(score) ? 0.5 : score));
  } catch {
    // Fallback: try to extract a bare float from the response
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    if (match && match[1] !== undefined) {
      const score = parseFloat(match[1]);
      return Math.min(1, Math.max(0, isNaN(score) ? 0.5 : score));
    }
    return 0.5; // neutral fallback
  }
}

export { cohere, SELF_ASSESSMENT_CONTENT };
export default cohere;
