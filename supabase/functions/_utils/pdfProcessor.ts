import { extractText } from 'npm:unpdf@0.12.1';

export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const { text } = await extractText(pdfBuffer);

    if (!text) {
      throw new Error("Could not extract text from PDF.");
    }

    return text.replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error processing PDF with unpdf:", error);
    throw new Error(`Failed to parse PDF content: ${error.message}`);
  }
}