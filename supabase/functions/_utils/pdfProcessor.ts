export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(pdfBuffer);

    text = text
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text || text.length < 50) {
      throw new Error("Could not extract sufficient text from PDF.");
    }

    return text;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to parse PDF content: ${error.message}`);
  }
}