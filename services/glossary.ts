import { db } from '../db/index.js';
import { translation_glossary, type GlossaryTerm } from '../db/schema.js';

// In-memory cache — loaded once on startup, refreshed explicitly
let glossaryCache: Map<string, GlossaryTerm> = new Map();
let matchRegex: RegExp | null = null;

/**
 * Load all glossary terms from DB into memory and build the match regex.
 * Call once on server startup.
 */
export async function loadGlossaryCache(): Promise<number> {
  const terms = await db.select().from(translation_glossary);

  glossaryCache = new Map();
  for (const term of terms) {
    glossaryCache.set(term.term.toLowerCase(), term);
  }

  // Build one composite regex, sorted longest-first to prevent partial matches
  const sorted = terms
    .map((t) => t.term)
    .sort((a, b) => b.length - a.length);

  if (sorted.length > 0) {
    const escaped = sorted.map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    matchRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  } else {
    matchRegex = null;
  }

  return terms.length;
}

/**
 * Reload cache after seeding or updating glossary terms.
 */
export async function refreshCache(): Promise<number> {
  return loadGlossaryCache();
}

/**
 * Scan source text for glossary terms using the prebuilt regex.
 * Returns deduplicated matched GlossaryTerm objects.
 */
export function matchTerms(text: string): GlossaryTerm[] {
  if (!matchRegex) return [];

  const seen = new Set<string>();
  const matched: GlossaryTerm[] = [];

  for (const match of text.matchAll(matchRegex)) {
    const key = match[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const term = glossaryCache.get(key);
    if (term) matched.push(term);
  }

  return matched;
}

/**
 * Build the glossary context block for injection into a translation system prompt.
 * Only called when there are matched terms.
 */
export function buildGlossaryPrompt(terms: GlossaryTerm[]): string {
  if (terms.length === 0) return '';

  const termEntries = terms
    .map((t, i) => {
      const translateInstruction = t.doNotTranslate
        ? 'KEEP ORIGINAL — do not translate this term, keep it as-is with a brief target-language explanation on first use.'
        : 'TRANSLATE — use the target language and region\'s standard equivalent for this concept.';

      return `${i + 1}. "${t.term}" — ${t.meaning}\n   Context: ${t.usageContext}\n   [${translateInstruction}]`;
    })
    .join('\n\n');

  return `GLOSSARY — The following terms appear in the source text. Use these definitions to ensure accurate, contextually appropriate translations:

${termEntries}`;
}
