import type { Request, Response } from "express";
import { translateBatch } from "../services/cohere.js";
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

    res.status(200).json({ results });
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
