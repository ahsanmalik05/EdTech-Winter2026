import { db } from "../db/index.js";
import { translation_validations, type NewTranslationValidation } from "../db/schema.js";

export async function logTranslationValidation(
  params: Omit<NewTranslationValidation, "id" | "validatedAt">,
): Promise<void> {
  try {
    await db.insert(translation_validations).values({
      ...params,
      validatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log translation validation:", err);
  }
}
