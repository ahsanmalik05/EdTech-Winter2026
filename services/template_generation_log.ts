import { db } from "../db/index.js";
import { template_generation_log } from "../db/schema.js";
import type { TemplateGenerationLog } from "../db/schema.js";
import type { LogTemplateGenerationParams } from "../types/common.js";

export async function logTemplateGeneration(
  params: LogTemplateGenerationParams,
): Promise<void> {
  await db
    .insert(template_generation_log)
    .values({
      templateId: params.templateId ?? null,
      userId: params.userId ?? null,
      subject: params.subject.trim(),
      topic: params.topic.trim(),
      gradeLevel: params.gradeLevel.trim(),
      model: params.model.trim(),
      success: params.success,
      errorMessage: params.errorMessage?.trim() || null,
      latencyMs: params.latencyMs,
      createdAt: new Date(),
    })
    .execute();
}

export async function getTemplateGenerationLogs(): Promise<
  TemplateGenerationLog[]
> {
  return db
    .select()
    .from(template_generation_log)
    .orderBy(template_generation_log.createdAt)
    .execute();
}
