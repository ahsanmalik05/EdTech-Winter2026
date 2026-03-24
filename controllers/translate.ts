import type { Request, Response } from "express";
import { translateBatch } from "../services/cohere.js";

interface BatchTranslateBody {
  items: { id: string; text: string }[];
  targetLanguage: string;
  gradeLevel?: string;
}

export const batchTranslate = async (
  req: Request<object, object, BatchTranslateBody>,
  res: Response
) => {
  try {
    const { items, targetLanguage, gradeLevel } = req.body;

    if (!targetLanguage || typeof targetLanguage !== "string") {
      res
        .status(400)
        .json({ error: "targetLanguage is required and must be a string" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res
        .status(400)
        .json({ error: "items must be a non-empty array of { id, text } objects" });
      return;
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.id !== "string" ||
        typeof item.text !== "string"
      ) {
        res.status(400).json({
          error:
            "Each item must have a string 'id' and a string 'text' property",
        });
        return;
      }
    }

    if (gradeLevel !== undefined && typeof gradeLevel !== "string") {
      res
        .status(400)
        .json({ error: "gradeLevel must be a string if provided" });
      return;
    }

    const results = await translateBatch(items, targetLanguage, gradeLevel);

    res.status(200).json({ results });
  } catch (error) {
    console.error("Batch translation error:", error);
    res.status(500).json({ error: "Failed to perform batch translation" });
  }
};
