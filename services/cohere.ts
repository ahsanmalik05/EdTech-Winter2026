import { CohereClientV2 } from 'cohere-ai';
import config from '../config/config.js';

const cohere = new CohereClientV2({
  token: config.cohereApiKey,
});

export async function chat(message: string, model: string = 'command-a-03-2025') {
  const response = await cohere.chat({
    model,
    messages: [{ role: 'user', content: message }],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
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

const SELF_ASSESSMENT_CONTENT = `I`;

export async function translateToFrench(text: string, model: string = 'command-a-03-2025') {
  const prompt = `You are a professional translator. Translate the following text into French. Provide ONLY the French translation, nothing else.

Text to translate:
${text}`;

  const response = await cohere.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
}

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
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message?.content?.[0]?.type === 'text' 
    ? response.message.content[0].text 
    : null;
}

export async function translateContentStream(
  content: string,
  targetLanguage: string,
  onToken: (token: string) => void,
  model: string = 'command-a-03-2025'
) {
  const prompt = `You are a professional translator. Translate the following content into ${targetLanguage}. Maintain the same structure, formatting, and tone. Provide ONLY the translated text without any explanations.

CONTENT TO TRANSLATE:

${content}`;

  const stream = await cohere.chatStream({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content-delta' && event.delta?.message?.content?.text) {
      onToken(event.delta.message.content.text);
    }
  }
}

export { cohere, SELF_ASSESSMENT_CONTENT };
export default cohere;
