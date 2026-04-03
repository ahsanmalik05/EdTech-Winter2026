import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { template_validations, type NewTemplateValidation } from "../db/schema.js";

export async function createPendingTemplateValidation(
  params: Pick<NewTemplateValidation, "templateId" | "generationLogId" | "model">,
): Promise<number | null> {
  try {
    const [row] = await db
      .insert(template_validations)
      .values({
        templateId: params.templateId,
        generationLogId: params.generationLogId,
        model: params.model,
        status: "pending",
        isValid: null,
        issues: [],
        validatedAt: new Date(),
      })
      .returning({ id: template_validations.id });
    return row?.id ?? null;
  } catch (err) {
    console.error("Failed to create pending template validation:", err);
    return null;
  }
}

export async function completeTemplateValidation(
  validationId: number,
  result: { isValid: boolean; issues: string[] },
): Promise<void> {
  try {
    await db
      .update(template_validations)
      .set({
        isValid: result.isValid,
        issues: result.issues,
        status: "completed",
        validatedAt: new Date(),
      })
      .where(eq(template_validations.id, validationId));
  } catch (err) {
    console.error("Failed to complete template validation:", err);
  }
}

export async function failTemplateValidation(
  validationId: number,
): Promise<void> {
  try {
    await db
      .update(template_validations)
      .set({ status: "failed" })
      .where(eq(template_validations.id, validationId));
  } catch (err) {
    console.error("Failed to mark template validation as failed:", err);
  }
}

export async function logTemplateValidation(
  params: Omit<NewTemplateValidation, "id" | "validatedAt">,
): Promise<void> {
  try {
    await db.insert(template_validations).values({
      ...params,
      status: "completed",
      validatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log template validation:", err);
  }
}
