import type { Request, Response } from "express";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  template_generation_log,
  template_validations,
  translation_log,
  translation_validations,
  users,
} from "../db/schema.js";

export const getAdminTranslationValidations = async (
  req: Request,
  res: Response,
) => {
  try {
    const { dateFrom, dateTo, userId, model, language, validationStatus } =
      req.query;

    let dateTo_end: Date | undefined;
    if (dateTo && typeof dateTo === "string") {
      dateTo_end = new Date(dateTo);
      dateTo_end.setHours(23, 59, 59, 999);
    }

    const parsedUserId =
      userId && typeof userId === "string" ? parseInt(userId, 10) : NaN;

    const where = and(
      dateFrom && typeof dateFrom === "string"
        ? gte(translation_log.createdAt, new Date(dateFrom))
        : undefined,
      dateTo_end ? lte(translation_log.createdAt, dateTo_end) : undefined,
      !isNaN(parsedUserId)
        ? eq(translation_log.userId, parsedUserId)
        : undefined,
      model && typeof model === "string"
        ? eq(translation_log.model, model)
        : undefined,
      language && typeof language === "string"
        ? eq(translation_log.targetLanguage, language)
        : undefined,
      validationStatus === "missing"
        ? isNull(translation_validations.id)
        : undefined,
    );

    const rows = await db
      .select({
        id: translation_log.id,
        userId: translation_log.userId,
        userEmail: users.email,
        sourceText: translation_log.sourceText,
        translatedText: translation_log.translatedText,
        sourceLanguage: translation_log.sourceLanguage,
        targetLanguage: translation_log.targetLanguage,
        model: translation_log.model,
        tokenCount: translation_log.tokenCount,
        inputTokenCount: translation_log.inputTokenCount,
        outputTokenCount: translation_log.outputTokenCount,
        costUsd: translation_log.costUsd,
        latencyMs: translation_log.latencyMs,
        cached: translation_log.cached,
        createdAt: translation_log.createdAt,
        validationId: translation_validations.id,
        backTranslatedText: translation_validations.backTranslatedText,
        similarityScore: translation_validations.similarityScore,
        similarityReasoning: translation_validations.similarityReasoning,
        sectionCountMatch: translation_validations.sectionCountMatch,
        originalSectionCount: translation_validations.originalSectionCount,
        translatedSectionCount: translation_validations.translatedSectionCount,
        headersIntact: translation_validations.headersIntact,
        overallConfidence: translation_validations.overallConfidence,
        translatorNotes: translation_validations.translatorNotes,
        validationIssues: translation_validations.issues,
        validatedAt: translation_validations.validatedAt,
      })
      .from(translation_log)
      .leftJoin(
        translation_validations,
        eq(translation_validations.translationLogId, translation_log.id),
      )
      .leftJoin(users, eq(users.id, translation_log.userId))
      .where(where)
      .orderBy(desc(translation_log.createdAt))
      .limit(500)
      .execute();

    return res.status(200).json({ entries: rows });
  } catch (error) {
    console.error("Error fetching admin translation validations:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch translation validations" });
  }
};

export const getAdminGenerationValidations = async (
  req: Request,
  res: Response,
) => {
  try {
    const { dateFrom, dateTo, userId, model, success, validationStatus } =
      req.query;

    let dateTo_end: Date | undefined;
    if (dateTo && typeof dateTo === "string") {
      dateTo_end = new Date(dateTo);
      dateTo_end.setHours(23, 59, 59, 999);
    }

    const parsedUserId =
      userId && typeof userId === "string" ? parseInt(userId, 10) : NaN;

    const where = and(
      dateFrom && typeof dateFrom === "string"
        ? gte(template_generation_log.createdAt, new Date(dateFrom))
        : undefined,
      dateTo_end
        ? lte(template_generation_log.createdAt, dateTo_end)
        : undefined,
      !isNaN(parsedUserId)
        ? eq(template_generation_log.userId, parsedUserId)
        : undefined,
      model && typeof model === "string"
        ? eq(template_generation_log.model, model)
        : undefined,
      success === "true"
        ? eq(template_generation_log.success, true)
        : success === "false"
          ? eq(template_generation_log.success, false)
          : undefined,
      validationStatus === "missing"
        ? isNull(template_validations.id)
        : validationStatus === "invalid"
          ? eq(template_validations.isValid, false)
          : undefined,
    );

    const rows = await db
      .select({
        id: template_generation_log.id,
        templateId: template_generation_log.templateId,
        userId: template_generation_log.userId,
        userEmail: users.email,
        subject: template_generation_log.subject,
        topic: template_generation_log.topic,
        gradeLevel: template_generation_log.gradeLevel,
        model: template_generation_log.model,
        success: template_generation_log.success,
        errorMessage: template_generation_log.errorMessage,
        tokenCount: template_generation_log.tokenCount,
        inputTokenCount: template_generation_log.inputTokenCount,
        outputTokenCount: template_generation_log.outputTokenCount,
        costUsd: template_generation_log.costUsd,
        latencyMs: template_generation_log.latencyMs,
        createdAt: template_generation_log.createdAt,
        validationId: template_validations.id,
        isValid: template_validations.isValid,
        validationIssues: template_validations.issues,
        validationModel: template_validations.model,
        validatedAt: template_validations.validatedAt,
      })
      .from(template_generation_log)
      .leftJoin(
        template_validations,
        eq(template_validations.generationLogId, template_generation_log.id),
      )
      .leftJoin(users, eq(users.id, template_generation_log.userId))
      .where(where)
      .orderBy(desc(template_generation_log.createdAt))
      .limit(500)
      .execute();

    return res.status(200).json({ entries: rows });
  } catch (error) {
    console.error("Error fetching admin generation validations:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch generation validations" });
  }
};
