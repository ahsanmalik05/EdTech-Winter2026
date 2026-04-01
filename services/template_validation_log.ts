import { db } from "../db/index.js";
import { template_validations, type NewTemplateValidation } from "../db/schema.js";

export async function logTemplateValidation(
  params: Omit<NewTemplateValidation, "id" | "validatedAt">,
): Promise<void> {
  try {
    await db.insert(template_validations).values({
      ...params,
      validatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log template validation:", err);
  }
}
