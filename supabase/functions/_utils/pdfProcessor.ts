import pdf from 'https://esm.sh/pdf-parse@1.1.1';

export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    return data.text.replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to parse PDF content.");
  }
}