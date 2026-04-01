import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { template_generation_log } from "../db/schema.js";
import type { TemplateGenerationLog } from "../db/schema.js";
import type { LogTemplateGenerationParams } from "../types/common.js";

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-5-nano": {
    input: 0.05 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  "command-a-translate-08-2025": {
    input: 0,
    output: 0,
  },
  // will add more models as needed
};

function calculateCost(
  model: string,
  inputTokenCount: number | undefined,
  outputTokenCount: number | undefined,
): number | null {
  const inputTokens = inputTokenCount ?? 0;
  const outputTokens = outputTokenCount ?? 0;
  if (inputTokens === 0 && outputTokens === 0) return null;
  return (
    inputTokens * (MODEL_COSTS[model]?.input ?? 0) +
    outputTokens * (MODEL_COSTS[model]?.output ?? 0)
  );
}

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
