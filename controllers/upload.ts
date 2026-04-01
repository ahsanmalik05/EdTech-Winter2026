import type { Request, Response } from "express";
import {
  deleteLocalFile,
  extractStructuredTextFromPdf,
  blocksToText,
  type DocumentBlock,
  type TranslatedBlock,
} from "../services/pdf.js";
import { translateContent } from "../services/cohere.js";
import { translateContentStream } from "../services/cohere.js";
import { validateTranslation } from "../services/validate.js";
import { logTranslation } from "../services/translation_log.js";
import { logTranslationValidation } from "../services/translation_validation_log.js";
import {
  archiveUploadedPdf,
  getRequestUserId,
} from "../services/pdf_upload.js";

const DEFAULT_MODEL = "command-a-translate-08-2025";
/**
 * Translate a single DocumentBlock while preserving its structure.
 */
async function translateBlock(
  block: DocumentBlock,
  targetLanguage: string,
): Promise<TranslatedBlock> {
  // Leave blank blocks unchanged
  if (block.type === "blank") {
    return block;
  }

  // Special handling for table rows:
  // translate each cell individually so structure is preserved
  if (block.type === "table_row" && block.cells) {
    const translatedCells = await Promise.all(
      block.cells.map(async (cell) => {
        if (!cell.trim()) return cell;
        const result = await translateContent(cell, targetLanguage);
        return result?.data?.translatedText ?? cell;
      }),
    );

  return {
    ...block,
    cells: translatedCells,
    content: translatedCells.join(" | "),
    notes: undefined,
  };
  }

  // For normal text blocks, translate content if non-empty
  if (!block.content.trim()) {
    return block;
  }

  const { data, tokenCount } = await translateContent(block.content, targetLanguage);

  return {
    ...block,
    content: data?.translatedText ?? block.content,
    tokenCount,
    notes: data?.notes,
  };
}

/**
 * Translate all blocks in a document.
 */
async function translateBlocks(
  blocks: DocumentBlock[],
  targetLanguage: string,
): Promise<TranslatedBlock[]> {
  return Promise.all(
    blocks.map((block) => translateBlock(block, targetLanguage)),
  );
}

export const uploadPdfFile = async (req: Request, res: Response) => {
  const filePath = req.file?.path;

  try {
    const start = Date.now();
    if (!req.file || !filePath) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    await archiveUploadedPdf({
      file: req.file,
      flow: "pdf",
      userId: getRequestUserId(req),
    });

    const targetLanguage = (req.body.language as string) || "French";
    const blocks = await extractStructuredTextFromPdf(filePath);
    const extractedText = blocksToText(blocks);

    if (!extractedText.trim()) {
      return res.status(422).json({
        error: "Could not extract text from PDF. The file may be image-based or empty."
      });
    }

    const translatedBlocks = await translateBlocks(blocks, targetLanguage);
    const translatedText = blocksToText(translatedBlocks);
    const translatorNotes = translatedBlocks
      .map((b) => b.notes)
      .filter((n): n is string => !!n)
      .join("\n\n");

    const latencyMs = Date.now() - start;

    if (req.apiKey) {
      try {
        const translationLogId = await logTranslation({
          userId: req.apiKey.user_id,
          sourceText: extractedText,
          translatedText: translatedText || undefined,
          sourceLanguage: undefined,
          targetLanguage,
          model: DEFAULT_MODEL,
          tokenCount: translatedBlocks.reduce((sum, block) => sum + (block.tokenCount ?? 0), 0),
          inputTokenCount: undefined,
          outputTokenCount: undefined,
          costUsd: undefined,
          latencyMs,
        });

        if (translationLogId) {
          void validateTranslation(extractedText, translatedText, targetLanguage)
            .then((validation) => {
              void logTranslationValidation({
                translationLogId,
                backTranslatedText: validation.backTranslated,
                similarityScore: validation.similarityScore?.toString() ?? null,
                similarityReasoning: validation.similarityReasoning,
                sectionCountMatch: validation.structuralChecks.sectionCountMatch,
                originalSectionCount: validation.structuralChecks.originalSectionCount,
                translatedSectionCount: validation.structuralChecks.translatedSectionCount,
                headersIntact: validation.structuralChecks.headersIntact,
                overallConfidence: validation.overallConfidence.toString(),
                translatorNotes: translatorNotes || null,
                issues: [],
              });
            })
            .catch((err) => console.error("Failed to validate translation:", err));
        }
      } catch (logErr) {
        console.error("Failed to log PDF translation:", logErr);
      }
    }

    return res.status(200).json({
      originalName: req.file.originalname,
      targetLanguage,
      extractedText,
      translatedText,
    });
  } catch (err) {
    console.error("PDF processing error:", err);
    return res.status(500).json({ error: "Failed to process PDF" });
  } finally {
    if (filePath) {
      await deleteLocalFile(filePath);
    }
  }
};

export const uploadPdfFileStream = async (req: Request, res: Response) => {
  const filePath = req.file?.path;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!req.file || !filePath) {
      sendEvent("error", { error: "No PDF file uploaded" });
      return res.end();
    }

    await archiveUploadedPdf({
      file: req.file,
      flow: "pdf_stream",
      userId: getRequestUserId(req),
    });

    const targetLanguage = (req.body.language as string) || "French";

    sendEvent("status", { step: "extracting" });

    const blocks = await extractStructuredTextFromPdf(filePath);
    const extractedText = blocksToText(blocks);

    if (!extractedText.trim()) {
      sendEvent("error", {
        error:
          "Could not extract text from PDF. The file may be image-based or empty.",
      });
      return res.end();
    }

    sendEvent("extracted", {
      originalName: req.file.originalname,
      targetLanguage,
      extractedText,
    });

    sendEvent("status", { step: "translating" });
    const start = Date.now();
    let fullTranslation = "";
    const { tokenCount } = await translateContentStream(
      extractedText,
      targetLanguage,
      (token) => {
        fullTranslation += token;
        sendEvent("token", { token });
      },
    );
    const latencyMs = Date.now() - start;

    if (req.apiKey) {
      try {
        await logTranslation({
          userId: req.apiKey.user_id,
          sourceText: extractedText,
          translatedText: fullTranslation || undefined,
          sourceLanguage: undefined,
          targetLanguage,
          model: DEFAULT_MODEL,
          tokenCount: tokenCount ?? undefined,
          inputTokenCount: undefined,
          outputTokenCount: undefined,
          costUsd: undefined,
          latencyMs,
        });
      } catch (logErr) {
        console.error("Failed to log streamed PDF translation:", logErr);
      }
    }

    const translatedBlocks = await translateBlocks(blocks, targetLanguage);
    const translatedText = blocksToText(translatedBlocks);

    sendEvent("translated", {
      translatedText,
    });

    sendEvent("complete", {});
    res.end();
  } catch (err) {
    console.error("PDF processing error:", err);
    sendEvent("error", { error: "Failed to process PDF" });
    res.end();
  } finally {
    if (filePath) {
      await deleteLocalFile(filePath);
    }
  }
};
