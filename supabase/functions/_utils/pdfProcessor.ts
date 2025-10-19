// We'll use a popular library to help us parse PDF files.
import pdf from 'https://esm.sh/pdf-parse@1.1.1';

/**
 * processPdf takes a PDF file buffer and extracts the text content.
 * @param {Uint8Array} pdfBuffer - The raw data of the PDF file.
 * @returns {Promise<string>} A promise that resolves with the extracted text.
 */
export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    // We clean up the text a bit by removing extra spaces and blank lines.
    return data.text.replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to parse PDF content.");
  }
}