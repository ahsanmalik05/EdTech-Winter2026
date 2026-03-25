import type { Request, Response } from "express";
import { translateBatch } from "../services/cohere.js";
import { logTranslation, getTranslationStatsFromDb } from "../services/translation_log.js";

const DEFAULT_MODEL = 'command-a-03-2025';
import { extractTextFromPdf, deleteFile } from "../services/pdf.js";

export const batchTranslate = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  try {
    const targetLanguage = req.body.targetLanguage as string | undefined;
    const gradeLevel = req.body.gradeLevel as string | undefined;

    if (!targetLanguage || typeof targetLanguage !== "string") {
      res
        .status(400)
        .json({ error: "targetLanguage is required and must be a string" });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one PDF file is required" });
      return;
    }

    if (gradeLevel !== undefined && typeof gradeLevel !== "string") {
      res
        .status(400)
        .json({ error: "gradeLevel must be a string if provided" });
      return;
    }

    const start = Date.now();
    const items: { id: string; text: string }[] = [];

    for (const file of files) {
      const text = await extractTextFromPdf(file.path);
      if (!text.trim()) {
        res.status(422).json({
          error: `Could not extract text from "${file.originalname}". The file may be image-based or empty.`,
        });
        return;
      }
      items.push({ id: file.originalname, text });
    }

    const results = await translateBatch(items, targetLanguage, gradeLevel);
    const latencyMs = Date.now() - start;

    res.status(200).json({ results });

    if (req.apiKey) {
      for (const item of items) {
        const result = results[item.id];
        if (result) {
          logTranslation({
            userId: req.apiKey.user_id,
            sourceText: item.text,
            translatedText: result.translatedText ?? undefined,
            targetLanguage,
            model: DEFAULT_MODEL,
            tokenCount: result.tokenCount ?? undefined,
            latencyMs,
          }).catch((err) => console.error("Failed to log translation:", err));
        }
      }
    }
  } catch (error) {
    console.error("Batch translation error:", error);
    res.status(500).json({ error: "Failed to perform batch translation" });
  } finally {
    if (files) {
      for (const file of files) {
        await deleteFile(file.path);
      }
    }
  }
};

export const getTranslationStats = async (_req: Request, res: Response) => {
  try {
    const stats = await getTranslationStatsFromDb();
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching translation stats:", error);
    return res.status(500).json({ error: "Failed to fetch translation stats" });
  }
};
