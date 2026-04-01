import { eq, and, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import config from "../config/config.js";
import {
  templates,
  templateSections,
  type NewTemplate,
  type NewTemplateSection,
} from "../db/schema.js";
import { orchestrateGeneration, type GenerationResult } from "./openai.js";
import type {
  GenerateTemplateRequest,
  TemplateResponse,
  TemplateSections,
  ListTemplatesQuery,
  UpdateTemplateRequest,
} from "../types/templates.js";

export const DEFAULT_TEMPLATE_MODEL = config.models.generation;
const SECTION_ORDER: Array<keyof TemplateSections> = [
  "introduction",
  "model_assessment",
  "self_review",
];

function buildResponse(
  template: typeof templates.$inferSelect,
  sections: (typeof templateSections.$inferSelect)[],
): TemplateResponse {
  const sectionMap: TemplateSections = {
    introduction: "",
    model_assessment: "",
    self_review: "",
  };
  for (const s of sections) {
    sectionMap[s.sectionType as keyof TemplateSections] = s.content;
  }

  return {
    id: template.id,
    subject: template.subject,
    topic: template.topic,
    gradeLevel: template.gradeLevel,
    version: template.version,
    isActive: template.isActive,
    sections: sectionMap,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export interface GenerateTemplateResult {
  response: TemplateResponse;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
}

export async function generateTemplate(
  params: GenerateTemplateRequest,
  createdByUserId?: number,
): Promise<GenerateTemplateResult> {
  const { subject, topic, gradeLevel } = params;

  const result = await orchestrateGeneration(subject, topic, gradeLevel);
  const { sections, usage } = result;

  const existing = await db
    .select({ version: templates.version })
    .from(templates)
    .where(
      and(
        ilike(templates.subject, subject),
        ilike(templates.topic, topic),
        ilike(templates.gradeLevel, gradeLevel),
      ),
    )
    .orderBy(templates.version)
    .limit(1);

  const nextVersion = existing.length > 0 ? existing[0]!.version + 1 : 1;

  const newTemplate: NewTemplate = {
    subject,
    topic,
    gradeLevel,
    version: nextVersion,
    ...(createdByUserId ? { createdByUserId } : {}),
  };

  const [inserted] = await db.insert(templates).values(newTemplate).returning();
  if (!inserted) throw new Error("Failed to insert template");

  const sectionRows: NewTemplateSection[] = SECTION_ORDER.map((type, idx) => ({
    templateId: inserted.id,
    sectionType: type,
    content: sections[type],
    orderIndex: idx,
  }));

  const insertedSections = await db
    .insert(templateSections)
    .values(sectionRows)
    .returning();

  const response = buildResponse(inserted, insertedSections);
  return { response, usage };
}

export async function getTemplateById(
  id: number,
  userId?: number,
): Promise<TemplateResponse | null> {
  const conditions = [eq(templates.id, id)];
  if (userId !== undefined) {
    conditions.push(eq(templates.createdByUserId, userId));
  }

  const [template] = await db
    .select()
    .from(templates)
    .where(and(...conditions))
    .limit(1);

  if (!template) return null;

  const sections = await db
    .select()
    .from(templateSections)
    .where(eq(templateSections.templateId, id));

  return buildResponse(template, sections);
}

export async function listTemplates(
  filters: ListTemplatesQuery,
  userId?: number,
): Promise<TemplateResponse[]> {
  const conditions = [];

  if (userId !== undefined) {
    conditions.push(eq(templates.createdByUserId, userId));
  }
  if (filters.subject) {
    conditions.push(ilike(templates.subject, `%${filters.subject}%`));
  }
  if (filters.gradeLevel) {
    conditions.push(ilike(templates.gradeLevel, `%${filters.gradeLevel}%`));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(templates.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const allTemplates = await db
    .select()
    .from(templates)
    .where(whereClause)
    .orderBy(templates.createdAt);

  const results: TemplateResponse[] = [];
  for (const t of allTemplates) {
    const sections = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, t.id));
    results.push(buildResponse(t, sections));
  }

  return results;
}

export async function updateTemplate(
  id: number,
  updates: UpdateTemplateRequest,
  userId?: number,
): Promise<TemplateResponse | null> {
  const conditions = [eq(templates.id, id)];
  if (userId !== undefined) {
    conditions.push(eq(templates.createdByUserId, userId));
  }

  const [existing] = await db
    .select()
    .from(templates)
    .where(and(...conditions))
    .limit(1);

  if (!existing) return null;

  const metaUpdates: Partial<NewTemplate> = {};
  if (updates.subject) metaUpdates.subject = updates.subject;
  if (updates.topic) metaUpdates.topic = updates.topic;
  if (updates.gradeLevel) metaUpdates.gradeLevel = updates.gradeLevel;

  if (Object.keys(metaUpdates).length > 0) {
    await db
      .update(templates)
      .set({ ...metaUpdates, updatedAt: new Date() })
      .where(eq(templates.id, id));
  }

  if (updates.sections) {
    for (const [type, content] of Object.entries(updates.sections)) {
      if (content !== undefined) {
        await db
          .update(templateSections)
          .set({ content })
          .where(
            and(
              eq(templateSections.templateId, id),
              eq(
                templateSections.sectionType,
                type as "introduction" | "model_assessment" | "self_review",
              ),
            ),
          );
      }
    }
  }

  return getTemplateById(id);
}

export async function deactivateTemplate(
  id: number,
  userId?: number,
): Promise<boolean> {
  const conditions = [eq(templates.id, id)];
  if (userId !== undefined) {
    conditions.push(eq(templates.createdByUserId, userId));
  }

  const result = await db
    .update(templates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: templates.id });

  return result.length > 0;
}
