import type { Request, Response } from "express";
import { translateBatch, translateContent } from "../services/cohere.js";
import {
  logTranslation,
  getTranslationStatsFromDb,
} from "../services/translation_log.js";

const DEFAULT_MODEL = "command-a-translate-08-2025";
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
          try {
            const res = await logTranslation({
              userId: req.apiKey.user_id,
              sourceText: item.text,
              translatedText: result.translatedText ?? undefined,
              targetLanguage,
              model: DEFAULT_MODEL,
              tokenCount: result.tokenCount ?? undefined,
              latencyMs,
            });
            console.log("Logged translation:", res);
          } catch (err) {
            console.error("Failed to log translation:", err);
          }
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

export const batchTranslateStream = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") (res as any).flush();
  };

  try {
    const targetLanguage = req.body.targetLanguage as string | undefined;
    const gradeLevel = req.body.gradeLevel as string | undefined;

    if (!targetLanguage || typeof targetLanguage !== "string") {
      sendEvent("error", {
        error: "targetLanguage is required and must be a string",
      });
      return res.end();
    }

    if (!files || files.length === 0) {
      sendEvent("error", { error: "At least one PDF file is required" });
      return res.end();
    }

    if (gradeLevel !== undefined && typeof gradeLevel !== "string") {
      sendEvent("error", { error: "gradeLevel must be a string if provided" });
      return res.end();
    }

    sendEvent("status", { total: files.length });

    const tasks = files.map(async (file) => {
      const fileName = file.originalname;

      sendEvent("extracting", { fileName });

      const text = await extractTextFromPdf(file.path);
      if (!text.trim()) {
        sendEvent("item_error", {
          fileName,
          error: `Could not extract text from "${fileName}". The file may be image-based or empty.`,
        });
        return;
      }

      sendEvent("translating", { fileName });

      const { text: translatedText } = await translateContent(text, targetLanguage);

      if (translatedText) {
        sendEvent("item_done", {
          fileName,
          originalText: text,
          translatedText,
        });
      } else {
        sendEvent("item_error", {
          fileName,
          error: "Translation returned no content",
        });
      }
    });

    await Promise.allSettled(tasks);

    sendEvent("complete", {});
    res.end();
  } catch (error) {
    console.error("Batch stream translation error:", error);
    sendEvent("error", { error: "Failed to perform batch translation" });
    res.end();
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
