import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelectFrom } = vi.hoisted(() => ({
  mockDbSelectFrom: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: () => ({ from: mockDbSelectFrom }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  translation_glossary: 'translation_glossary_table',
}));

import { matchTerms, buildGlossaryPrompt, loadGlossaryCache } from '../../services/glossary.js';

describe('buildGlossaryPrompt', () => {
  it('returns empty string when terms array is empty', () => {
    expect(buildGlossaryPrompt([])).toBe('');
  });

  it('builds prompt with TRANSLATE instruction', () => {
    const terms = [{
      id: 1, term: 'variable', meaning: 'an unknown quantity', category: 'algebra',
      usageContext: 'math equation', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date(),
    }];
    const result = buildGlossaryPrompt(terms);
    expect(result).toContain('GLOSSARY');
    expect(result).toContain('"variable"');
    expect(result).toContain('TRANSLATE');
    expect(result).not.toContain('KEEP ORIGINAL');
  });

  it('builds prompt with KEEP ORIGINAL for doNotTranslate terms', () => {
    const terms = [{
      id: 2, term: 'STEM', meaning: 'Science, Technology, Engineering, Math', category: 'education',
      usageContext: 'cross-subject', doNotTranslate: true, createdAt: new Date(), updatedAt: new Date(),
    }];
    const result = buildGlossaryPrompt(terms);
    expect(result).toContain('KEEP ORIGINAL');
    expect(result).toContain('"STEM"');
  });

  it('numbers multiple terms', () => {
    const terms = [
      { id: 1, term: 'A', meaning: 'm1', category: 'c', usageContext: 'u', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, term: 'B', meaning: 'm2', category: 'c', usageContext: 'u', doNotTranslate: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    const result = buildGlossaryPrompt(terms);
    expect(result).toContain('1. "A"');
    expect(result).toContain('2. "B"');
  });
});

describe('loadGlossaryCache & matchTerms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('matchTerms returns empty array when cache is empty', () => {
    expect(matchTerms('anything here')).toEqual([]);
  });

  it('loads terms and matches them in text', async () => {
    const terms = [
      { id: 1, term: 'coefficient', meaning: 'a number', category: 'math', usageContext: 'algebra', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, term: 'variable', meaning: 'unknown', category: 'math', usageContext: 'algebra', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockDbSelectFrom.mockResolvedValue(terms);
    const count = await loadGlossaryCache();
    expect(count).toBe(2);

    const matched = matchTerms('The coefficient in a variable expression');
    expect(matched).toHaveLength(2);
    expect(matched.map(t => t.term)).toContain('coefficient');
    expect(matched.map(t => t.term)).toContain('variable');
  });

  it('deduplicates repeated matches', async () => {
    const terms = [
      { id: 1, term: 'equation', meaning: 'expression with =', category: 'math', usageContext: 'algebra', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockDbSelectFrom.mockResolvedValue(terms);
    await loadGlossaryCache();
    const matched = matchTerms('The equation has an equation and more equation');
    expect(matched).toHaveLength(1);
  });

  it('returns empty when no terms match', async () => {
    const terms = [
      { id: 1, term: 'coefficient', meaning: 'a number', category: 'math', usageContext: 'algebra', doNotTranslate: false, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockDbSelectFrom.mockResolvedValue(terms);
    await loadGlossaryCache();
    expect(matchTerms('no matches here')).toHaveLength(0);
  });

  it('handles empty glossary from DB', async () => {
    mockDbSelectFrom.mockResolvedValue([]);
    const count = await loadGlossaryCache();
    expect(count).toBe(0);
    expect(matchTerms('coefficient variable')).toEqual([]);
  });
});
