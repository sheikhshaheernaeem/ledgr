/**
 * Server-side document → raw-text extraction.
 *
 * Supports:
 *   - text/plain (.txt)
 *   - text/csv (.csv)
 *   - application/pdf via pdf-parse
 *
 * Images are NOT OCR'd server-side (too heavy for Vercel functions).
 * Client uses tesseract.js in the browser and submits text directly.
 */

export interface ParsedDoc {
  text: string;
  pages?: number;
  mimeType: string;
  byteSize: number;
}

export async function parseDocument(file: File): Promise<ParsedDoc> {
  const mime = file.type || guessMime(file.name);
  const buf = Buffer.from(await file.arrayBuffer());

  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    // Lazy import to keep cold-starts fast
    const pdfParseMod = await import("pdf-parse");
    const pdfParse: (b: Buffer) => Promise<{ text: string; numpages?: number }> =
      // pdf-parse default export is the function
      (pdfParseMod as unknown as { default: (b: Buffer) => Promise<{ text: string; numpages?: number }> }).default ??
      (pdfParseMod as unknown as (b: Buffer) => Promise<{ text: string; numpages?: number }>);
    const out = await pdfParse(buf);
    return { text: out.text ?? "", pages: out.numpages, mimeType: "application/pdf", byteSize: buf.byteLength };
  }

  if (mime.startsWith("text/") || /\.(txt|csv|tsv|md|log)$/i.test(file.name)) {
    return { text: buf.toString("utf-8"), mimeType: mime || "text/plain", byteSize: buf.byteLength };
  }

  throw new Error(`Unsupported file type: ${mime || "unknown"} (${file.name}). Use PDF, CSV, or TXT. Images require client-side OCR before upload.`);
}

function guessMime(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    md: "text/markdown",
  };
  return map[ext] ?? "application/octet-stream";
}
