import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { translation_log } from "../db/schema.js";
import type { LogTranslationParams } from "../types/common.js";
import {
  logTranslation,
  getLogsByDateRange,
} from "../services/translation_log.js";

export const getTranslationLog = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const logEntries = await db
      .select()
      .from(translation_log)
      .where(eq(translation_log.userId, userId))
      .execute();

    return res.status(200).json({ log: logEntries });
  } catch (error) {
    console.error("Error fetching translation log:", error);
    return res.status(500).json({ error: "Failed to fetch translation log" });
  }
};

export const getTranslationLogEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { target_language } = req.query;

    if (target_language !== undefined) {
      if (
        typeof target_language !== "string" ||
        target_language.trim() === ""
      ) {
        return res
          .status(400)
          .json({ error: "target_language must be a non-empty string" });
      }
    }

    // Always scope to the authenticated user — ignore any user_id query param
    const conditions = [eq(translation_log.userId, userId)];
    if (target_language)
      conditions.push(
        eq(translation_log.targetLanguage, String(target_language)),
      );

    const logEntries = await db
      .select()
      .from(translation_log)
      .where(and(...conditions))
      .execute();

    return res.status(200).json({ log: logEntries });
  } catch (error) {
    console.error("Error fetching translation log entry:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch translation log entry" });
  }
};

export const addTranslationLogEntry = async (req: Request, res: Response) => {
  try {
    const authenticatedUserId = req.user?.id ?? req.apiKey?.user_id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      sourceText,
      translatedText,
      targetLanguage,
      model,
      tokenCount,
      latencyMs,
    } = req.body;

    if (
      sourceText === undefined ||
      targetLanguage === undefined ||
      model === undefined ||
      latencyMs === undefined
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: sourceText, targetLanguage, model, latencyMs",
      });
    }

    if (typeof sourceText !== "string" || sourceText.trim() === "") {
      return res
        .status(400)
        .json({ error: "sourceText must be a non-empty string" });
    }

    if (typeof targetLanguage !== "string" || targetLanguage.trim() === "") {
      return res
        .status(400)
        .json({ error: "targetLanguage must be a non-empty string" });
    }

    if (typeof model !== "string" || model.trim() === "") {
      return res
        .status(400)
        .json({ error: "model must be a non-empty string" });
    }

    if (
      typeof latencyMs !== "number" ||
      !Number.isFinite(latencyMs) ||
      latencyMs < 0
    ) {
      return res
        .status(400)
        .json({ error: "latencyMs must be a non-negative number" });
    }

    if (tokenCount !== undefined) {
      if (
        typeof tokenCount !== "number" ||
        !Number.isInteger(tokenCount) ||
        tokenCount < 0
      ) {
        return res
          .status(400)
          .json({ error: "tokenCount must be a non-negative integer" });
      }
    }

    // Always use the authenticated user's ID — never trust client-supplied userId
    await logTranslation({
      userId: authenticatedUserId,
      sourceText,
      translatedText,
      sourceLanguage: undefined,
      targetLanguage,
      model,
      tokenCount,
      inputTokenCount: undefined,
      outputTokenCount: undefined,
      costUsd: undefined,
      latencyMs,
    });

    return res
      .status(201)
      .json({ message: "Translation log entry added successfully" });
  } catch (error) {
    console.error("Error adding translation log entry:", error);
    return res
      .status(500)
      .json({ error: "Failed to add translation log entry" });
  }
};

export const deleteTranslationLogEntry = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const parsed = Number(id);
    if (!id || !Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const deleted = await db
      .delete(translation_log)
      .where(
        and(eq(translation_log.id, parsed), eq(translation_log.userId, userId)),
      )
      .returning()
      .execute();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Translation log entry not found" });
    }

    return res
      .status(200)
      .json({ message: "Translation log entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting translation log entry:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete translation log entry" });
  }
};

export const getLogsByDateRangeHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error:
          "Both 'from' and 'to' query parameters are required (ISO 8601 format)",
      });
    }

    if (typeof from !== "string" || typeof to !== "string") {
      return res.status(400).json({ error: "'from' and 'to' must be strings" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: "'from' is not a valid date" });
    }
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "'to' is not a valid date" });
    }
    if (fromDate > toDate) {
      return res
        .status(400)
        .json({ error: "'from' must be before or equal to 'to'" });
    }

    const entries = await getLogsByDateRange(fromDate, toDate, userId);
    return res.status(200).json({ log: entries, count: entries.length });
  } catch (error) {
    console.error("Error fetching logs by date range:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch logs by date range" });
  }
};
