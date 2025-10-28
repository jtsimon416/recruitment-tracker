import { WebPDFLoader } from "npm:@langchain/community@0.3.18/document_loaders/web/pdf";

export async function processPdf(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const pdfLoader = new WebPDFLoader(pdfBlob);
    const docs = await pdfLoader.load();

    const text = docs.map(doc => doc.pageContent).join('\n');
    return text.replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to parse PDF content.");
  }
}