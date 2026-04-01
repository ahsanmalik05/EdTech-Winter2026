import fs from "fs";
import fsp from "fs/promises";
import { PDFParse } from 'pdf-parse';

export type TranslatedBlock = { tokenCount?: number | null | undefined; notes?: string | undefined } & DocumentBlock ;

export interface DocumentBlock {
  type: 'heading' | 'paragraph' | 'bullet_list' | 'numbered_list' | 'table_row' | 'blank';
  content: string;
  indent: number;
  marker?: string;
  cells?: string[];
}

// Patterns that indicate the start of a new section in CSA templates
const NEW_PARAGRAPH_STARTERS = [
  /^for\s+\w/i,          // "For facts,", "For strategies,", "For the general plot,"
  /^with this in mind/i, // transition to model assessment section
  /^when i look over/i,  // transition to self-review section
  /^i want to teach/i,   // opening line of introduction
];

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);
  const data = await new PDFParse(uint8Array).getText();
  return data.text;
}

export async function extractStructuredTextFromPdf(filePath: string): Promise<DocumentBlock[]> {
  const rawText = await extractTextFromPdf(filePath);
  return parseTextIntoBlocks(rawText);
}

function parseTextIntoBlocks(text: string): DocumentBlock[] {
  const lines = text.split('\n');
  const blocks: DocumentBlock[] = [];

  for (const rawLine of lines) {
    const indent = rawLine.match(/^(\s*)/)?.[1]?.length ?? 0;
    const line = rawLine.trim();

    if (!line) {
      blocks.push({ type: 'blank', content: '', indent: 0 });
      continue;
    }

    // Skip page number markers like "-- 1 of 2 --"
    const isPageMarker = /^--\s*\d+\s*of\s*\d+\s*--$/i.test(line);
    if (isPageMarker) {
      continue;
    }

    // Detect bullet lists and preserve the exact bullet marker
    const bulletMatch = line.match(/^([-*•–])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet_list',
        marker: bulletMatch[1] ?? '•',
        content: bulletMatch[2] ?? line,
        indent
      });
      continue;
    }

    // Detect numbered lists and preserve the exact numbering marker
    const numberedMatch = line.match(/^(\d+[.)])\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered_list',
        marker: numberedMatch[1] ?? '1.',
        content: numberedMatch[2] ?? line,
        indent
      });
      continue;
    }

    // Detect simple table rows
    const tableCells = rawLine.trim().split(/\s{2,}|\t+/).filter(Boolean);
    if (tableCells.length >= 2 && looksLikeTableRow(rawLine)) {
      blocks.push({
        type: 'table_row',
        content: tableCells.join(' | '),
        cells: tableCells,
        indent
      });
      continue;
    }

    // Detect headings
    const isShort = line.length < 80;
    const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
    const noEndPunctuation =
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      !line.endsWith(':') &&
      !line.endsWith(';');

    if (isShort && (isAllCaps || (noEndPunctuation && line.length < 50))) {
      blocks.push({ type: 'heading', content: line, indent: 0 });
      continue;
    }

    // Everything else is a paragraph
    blocks.push({ type: 'paragraph', content: line, indent });
  }

  return mergeAdjacentParagraphs(blocks);
}

function looksLikeTableRow(rawLine: string): boolean {
  const cells = rawLine.trim().split(/\s{2,}|\t+/).filter(Boolean);
  if (cells.length < 2) return false;
  const allShort = cells.every(cell => cell.length < 30);
  return cells.length >= 3 || (cells.length >= 2 && allShort);
}

function mergeAdjacentParagraphs(blocks: DocumentBlock[]): DocumentBlock[] {
  const merged: DocumentBlock[] = [];

  for (const block of blocks) {
    const last = merged[merged.length - 1];

    if (
      block.type === 'paragraph' &&
      last?.type === 'paragraph' &&
      block.indent === last.indent
    ) {
      // Check if this line should start a new paragraph
      // even if there was no blank line before it in the PDF
      const startsNew = NEW_PARAGRAPH_STARTERS.some(p => p.test(block.content));

      if (startsNew) {
        merged.push({ ...block });
      } else {
        last.content += ' ' + block.content;
      }
    } else {
      merged.push({ ...block });
    }
  }

  return merged;
}

export function blocksToText(blocks: DocumentBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'blank': {
        // Only allow one blank line in a row — skip consecutive blanks
        const prev = lines[lines.length - 1];
        if (prev === '') continue;
        lines.push('');
        break;
      }

      case 'bullet_list':
        lines.push(`${' '.repeat(block.indent)}${block.marker ?? '•'} ${block.content}`);
        break;

      case 'numbered_list':
        lines.push(`${' '.repeat(block.indent)}${block.marker ?? '1.'} ${block.content}`);
        break;

      case 'heading':
        lines.push(block.content);
        break;

      case 'table_row':
        lines.push(block.cells
          ? `${' '.repeat(block.indent)}${block.cells.join(' | ')}`
          : `${' '.repeat(block.indent)}${block.content}`);
        break;

      case 'paragraph':
      default: {
        // If this paragraph starts a new section, ensure there's
        // a blank line before it for consistent spacing
        const needsSpaceBefore = NEW_PARAGRAPH_STARTERS.some(p => p.test(block.content));
        if (needsSpaceBefore && lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        lines.push(`${' '.repeat(block.indent)}${block.content}`);
        break;
      }
    }
  }

  // Remove any trailing blank lines at the end
  while (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

export async function deleteFile(filePath: string): Promise<void> {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}