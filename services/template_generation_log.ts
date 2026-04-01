import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { template_generation_log } from "../db/schema.js";
import type { TemplateGenerationLog } from "../db/schema.js";
import type { LogTemplateGenerationParams } from "../types/common.js";
import { calculateCost } from "../utils/cost.js";

export async function logTemplateGeneration(
  params: LogTemplateGenerationParams,
): Promise<number | null> {
  const costUsd = calculateCost(
    params.model,
    params.inputTokenCount,
    params.outputTokenCount,
  );
  const totalTokens =
    (params.inputTokenCount ?? 0) + (params.outputTokenCount ?? 0) || null;

  const [inserted] = await db
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
      tokenCount: totalTokens,
      inputTokenCount: params.inputTokenCount ?? null,
      outputTokenCount: params.outputTokenCount ?? null,
      costUsd: costUsd?.toString() ?? null,
      latencyMs: params.latencyMs,
      createdAt: new Date(),
    })
    .returning({ id: template_generation_log.id });

  return inserted?.id ?? null;
}

export async function getTemplateGenerationLogs(
  userId?: number,
): Promise<TemplateGenerationLog[]> {
  const query = db.select().from(template_generation_log);

  if (userId !== undefined) {
    return query
      .where(eq(template_generation_log.userId, userId))
      .orderBy(template_generation_log.createdAt)
      .execute();
  }

  return query.orderBy(template_generation_log.createdAt).execute();
}
