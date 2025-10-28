import * as pdfjsLib from "npm:pdfjs-dist@4.0.269";

export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const textPages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textPages.push(pageText);
    }

    const text = textPages.join('\n');
    return text.replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to parse PDF content: ${error.message}`);
  }
}