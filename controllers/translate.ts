import type { Request, Response } from "express";
import { translateBatch, translateContent } from "../services/cohere.js";
import {
  logTranslation,
  getTranslationStatsFromDb,
} from "../services/translation_log.js";

const DEFAULT_MODEL = "command-a-translate-08-2025";
import { extractTextFromPdf, deleteFile } from "../services/pdf.js";
import { computeFileHash, computeTextHash, uploadToBucket } from "../services/bucket.js";
import { findUploadedByHash, recordPdfUpload } from "../services/pdf_uploads.js";
import {
  getOrCreateSourceDocument,
  findCachedTranslation,
} from "../services/translation_cache.js";
import fs from "fs";

export const batchTranslate = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  try {
    const targetLanguage = req.body.targetLanguage as string | undefined;
    const sourceLanguage = req.body.sourceLanguage as string | undefined;
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
    const items: { id: string; text: string; sourceTextHash: string; sourceDocumentId?: number | undefined }[] = [];
    const cachedResults: Record<string, { data: { translatedText: string; notes: string } | null; tokenCount?: number | null; inputTokenCount?: number | null; outputTokenCount?: number | null }> = {};
    const uncachedItems: { id: string; text: string }[] = [];

    for (const file of files) {
      const contentHash = await computeFileHash(file.path);
      const fileSize = fs.statSync(file.path).size;
      const userId = req.apiKey?.user_id;

      const existingUpload = await findUploadedByHash(contentHash);
      let objectKey: string | undefined;
      let reusedExisting = false;

      if (existingUpload) {
        objectKey = existingUpload.objectKey;
        reusedExisting = true;
      } else {
        try {
          const result = await uploadToBucket(file.path, contentHash);
          objectKey = result.objectKey;
          reusedExisting = !result.uploaded;
        } catch (err) {
          console.error("Bucket upload failed for batch file:", err);
        }
      }

      try {
        await recordPdfUpload({
          userId,
          contentHash,
          originalName: file.originalname,
          objectKey,
          fileSizeBytes: fileSize,
          status: objectKey ? "uploaded" : "failed",
          reusedExisting,
        });
      } catch (err) {
        console.error("Failed to record batch PDF upload:", err);
      }

      const text = await extractTextFromPdf(file.path);
      if (!text.trim()) {
        res.status(422).json({
          error: `Could not extract text from "${file.originalname}". The file may be image-based or empty.`,
        });
        return;
      }

      const sourceTextHash = computeTextHash(text);
      let sourceDocumentId: number | undefined;
      try {
        const doc = await getOrCreateSourceDocument(text);
        sourceDocumentId = doc.id;
      } catch (err) {
        console.error("Failed to store source document:", err);
      }

      items.push({ id: file.originalname, text, sourceTextHash, sourceDocumentId });

      const cached = await findCachedTranslation({
        sourceTextHash,
        targetLanguage,
        model: DEFAULT_MODEL,
        gradeLevel: gradeLevel ?? null,
      });

      if (cached) {
        cachedResults[file.originalname] = {
          data: { translatedText: cached.translatedText, notes: "" },
          tokenCount: cached.tokenCount,
          inputTokenCount: cached.inputTokenCount,
          outputTokenCount: cached.outputTokenCount,
        };
      } else {
        uncachedItems.push({ id: file.originalname, text });
      }
    }

    let freshResults: Record<string, { data: { translatedText: string; notes: string } | null; tokenCount?: number | null; inputTokenCount?: number | null; outputTokenCount?: number | null; error?: string }> = {};
    if (uncachedItems.length > 0) {
      freshResults = await translateBatch(uncachedItems, targetLanguage, gradeLevel);
    }

    const results = { ...cachedResults, ...freshResults };
    const latencyMs = Date.now() - start;

    res.status(200).json({ results });

    if (req.apiKey) {
      for (const item of items) {
        const result = results[item.id];
        if (result) {
          const wasCached = item.id in cachedResults;
          try {
            await logTranslation({
              userId: req.apiKey.user_id,
              sourceText: item.text,
              translatedText: result.data?.translatedText ?? undefined,
              sourceLanguage,
              targetLanguage,
              model: DEFAULT_MODEL,
              tokenCount: result.tokenCount ?? undefined,
              inputTokenCount: result.inputTokenCount ?? undefined,
              outputTokenCount: result.outputTokenCount ?? undefined,
              costUsd: undefined,
              latencyMs,
              sourceTextHash: item.sourceTextHash,
              sourceDocumentId: item.sourceDocumentId,
              gradeLevel,
              cached: wasCached,
            });
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

      const contentHash = await computeFileHash(file.path);
      const fileSize = fs.statSync(file.path).size;
      const userId = req.apiKey?.user_id;

      const existingUpload = await findUploadedByHash(contentHash);
      let objectKey: string | undefined;
      let reusedExisting = false;

      if (existingUpload) {
        objectKey = existingUpload.objectKey;
        reusedExisting = true;
      } else {
        try {
          const result = await uploadToBucket(file.path, contentHash);
          objectKey = result.objectKey;
          reusedExisting = !result.uploaded;
        } catch (err) {
          console.error("Bucket upload failed for batch stream file:", err);
        }
      }

      try {
        await recordPdfUpload({
          userId,
          contentHash,
          originalName: fileName,
          objectKey,
          fileSizeBytes: fileSize,
          status: objectKey ? "uploaded" : "failed",
          reusedExisting,
        });
      } catch (err) {
        console.error("Failed to record batch stream PDF upload:", err);
      }

      sendEvent("extracting", { fileName });

      const text = await extractTextFromPdf(file.path);
      if (!text.trim()) {
        sendEvent("item_error", {
          fileName,
          error: `Could not extract text from "${fileName}". The file may be image-based or empty.`,
        });
        return;
      }

      const sourceTextHash = computeTextHash(text);
      let sourceDocumentId: number | undefined;
      try {
        const doc = await getOrCreateSourceDocument(text);
        sourceDocumentId = doc.id;
      } catch (err) {
        console.error("Failed to store source document:", err);
      }

      const cached = await findCachedTranslation({
        sourceTextHash,
        targetLanguage,
        model: DEFAULT_MODEL,
        gradeLevel: gradeLevel ?? null,
      });

      if (cached) {
        sendEvent("translating", { fileName });
        sendEvent("item_done", {
          fileName,
          originalText: text,
          translatedText: cached.translatedText,
        });
        return;
      }

      sendEvent("translating", { fileName });

      const { data } = await translateContent(
        text,
        targetLanguage,
      );
      const translatedText = data?.translatedText ?? null;

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
