import fs from "fs";
import { PDFParse } from 'pdf-parse';

export interface DocumentBlock {
  type: 'heading' | 'paragraph' | 'bullet_list' | 'numbered_list' | 'table_row' | 'blank';
  content: string;
  indent: number;
  marker?: string;
  cells?: string[];
}

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
    const indent = rawLine.match(/^(\s*)/)?.[1].length ?? 0;
    const line = rawLine.trim();

    if (!line) {
      blocks.push({ type: 'blank', content: '', indent: 0 });
      continue;
    }

    // Detect bullet lists and preserve the exact bullet marker
    const bulletMatch = line.match(/^([-*•–])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet_list',
        marker: bulletMatch[1],
        content: bulletMatch[2],
        indent
      });
      continue;
    }

    // Detect numbered lists and preserve the exact numbering marker
    const numberedMatch = line.match(/^(\d+[.)])\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered_list',
        marker: numberedMatch[1],
        content: numberedMatch[2],
        indent
      });
      continue;
    }

    // Detect simple table rows:
    // if the raw line contains chunks separated by 2+ spaces or tabs
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
  // Require at least 3 cells, or cells that are all short (under 30 chars)
  // to avoid misclassifying normal sentences with extra spaces
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
      last.content += ' ' + block.content;
    } else {
      merged.push({ ...block });
    }
  }

  return merged;
}

export function blocksToText(blocks: DocumentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'blank':
        return '';

      case 'bullet_list':
        return `${' '.repeat(block.indent)}${block.marker ?? '•'} ${block.content}`;

      case 'numbered_list':
        return `${' '.repeat(block.indent)}${block.marker ?? '1.'} ${block.content}`;

      case 'heading':
        return `\n${block.content}\n`;

      case 'table_row':
        return block.cells
          ? `${' '.repeat(block.indent)}${block.cells.join(' | ')}`
          : `${' '.repeat(block.indent)}${block.content}`;

      case 'paragraph':
      default:
        return `${' '.repeat(block.indent)}${block.content}`;
    }
  }).join('\n');
}

export async function deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
