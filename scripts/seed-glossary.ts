import { db } from '../db/index.js';
import { translation_glossary } from '../db/schema.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';

// Resolve from project root (process.cwd() since npm scripts run from project root)
const filePath = join(process.cwd(), 'scripts', 'seed-data', 'glossary.json');

interface SeedTerm {
  term: string;
  meaning: string;
  category: string;
  usage_context: string;
  do_not_translate: boolean;
}

async function seedGlossary() {
  const raw = readFileSync(filePath, 'utf-8');
  const terms: SeedTerm[] = JSON.parse(raw);

  console.log(`Seeding ${terms.length} glossary terms...`);

  for (const t of terms) {
    await db
      .insert(translation_glossary)
      .values({
        term: t.term,
        meaning: t.meaning,
        category: t.category,
        usageContext: t.usage_context,
        doNotTranslate: t.do_not_translate,
      })
      .onConflictDoUpdate({
        target: translation_glossary.term,
        set: {
          meaning: sql`excluded.meaning`,
          category: sql`excluded.category`,
          usageContext: sql`excluded.usage_context`,
          doNotTranslate: sql`excluded.do_not_translate`,
          updatedAt: sql`now()`,
        },
      });
  }

  console.log(`Done. ${terms.length} terms upserted.`);
  process.exit(0);
}

seedGlossary().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
