import fs from "fs";
import { PDFParse } from 'pdf-parse';

export async function extractTextFromPdf(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(buffer);
    const data = await new PDFParse(uint8Array).getText();
    return data.text;
}

export async function deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
