import type { Request, Response } from "express";
import {
  deleteFile,
  extractStructuredTextFromPdf,
  blocksToText,
  type DocumentBlock
} from "../services/pdf.js";
import { translateContent } from "../services/cohere.js";
import { extractTextFromPdf } from "../services/pdf.js";
import { translateContentStream } from "../services/cohere.js";
import { logTranslation } from "../services/translation_log.js";

const DEFAULT_MODEL = "command-a-translate-08-2025";
/**
 * Translate a single DocumentBlock while preserving its structure.
 */
async function translateBlock(
  block: DocumentBlock,
  targetLanguage: string
): Promise<DocumentBlock> {
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
        return result?.text ?? cell;
      })
    );

    return {
      ...block,
      cells: translatedCells,
      content: translatedCells.join(" | ")
    };
  }

  // For normal text blocks, translate content if non-empty
  if (!block.content.trim()) {
    return block;
  }

  const result = await translateContent(block.content, targetLanguage);

  return {
    ...block,
    content: result?.text ?? block.content
  };
}

/**
 * Translate all blocks in a document.
 */
async function translateBlocks(
  blocks: DocumentBlock[],
  targetLanguage: string
): Promise<DocumentBlock[]> {
  return Promise.all(blocks.map((block) => translateBlock(block, targetLanguage)));
}

export const uploadPdfFile = async (req: Request, res: Response) => {
  const filePath = req.file?.path;

    try {
        if (!req.file || !filePath) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }

        const targetLanguage = (req.body.language as string) || "French";
        const blocks = await extractStructuredTextFromPdf(filePath); //arjun
        const extractedText = blocksToText(blocks);

        if (!extractedText.trim()) {
            return res.status(422).json({ error: "Could not extract text from PDF. The file may be image-based or empty." });
        }

        const start = Date.now();
        const { tokenCount } = await translateContent(extractedText, targetLanguage);
        const latencyMs = Date.now() - start;
        
       

        if (!extractedText.trim()) {
          return res.status(422).json({
            error: "Could not extract text from PDF. The file may be image-based or empty."
          });
        }

        const translatedBlocks = await translateBlocks(blocks, targetLanguage);
        const translatedText = blocksToText(translatedBlocks);

        if (req.apiKey) {
            try {
                await logTranslation({
                    userId: req.apiKey.user_id,
                    sourceText: extractedText,
                    translatedText: translatedText ?? undefined,
                    targetLanguage,
                    model: DEFAULT_MODEL,
                    tokenCount: tokenCount ?? undefined,
                    latencyMs,
                });
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
            await deleteFile(filePath);
        }
    }
  }

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
          sendEvent('error', { error: "No PDF file uploaded" });
          return res.end();
      }

      const targetLanguage = (req.body.language as string) || "French";

      sendEvent('status', { step: 'extracting' });

      const blocks = await extractStructuredTextFromPdf(filePath);
      const extractedText = blocksToText(blocks);

      if (!extractedText.trim()) {
          sendEvent('error', { error: "Could not extract text from PDF. The file may be image-based or empty." });
          return res.end();
      }

      sendEvent('extracted', { 
          originalName: req.file.originalname,
          targetLanguage,
          extractedText 
      });

      sendEvent('status', { step: 'translating' });

      const translatedBlocks = await translateBlocks(blocks, targetLanguage);
      const translatedText = blocksToText(translatedBlocks);

      sendEvent("translated", {
        translatedText
      });

      const start = Date.now();
      let fullTranslation = '';
      const { tokenCount } = await translateContentStream(extractedText, targetLanguage, (token) => {
          fullTranslation += token;
          sendEvent('token', { token });
      });
      const latencyMs = Date.now() - start;

      if (req.apiKey) {
          try {
              await logTranslation({
                  userId: req.apiKey.user_id,
                  sourceText: extractedText,
                  translatedText: fullTranslation || undefined,
                  targetLanguage,
                  model: DEFAULT_MODEL,
                  tokenCount: tokenCount ?? undefined,
                  latencyMs,
              });
          } catch (logErr) {
              console.error("Failed to log streamed PDF translation:", logErr);
          }
      }

      sendEvent('complete', {});
      res.end();
  } catch (err) {
      console.error("PDF processing error:", err);
      sendEvent('error', { error: "Failed to process PDF" });
      res.end();
  } finally {
      if (filePath) {
          await deleteFile(filePath);
      }
  }
};