/**
 * Server-side document → raw text extraction.
 *
 * Handles whatever URL is passed (Blob URL, data: URL, or arbitrary HTTP):
 *   - application/pdf → pdf-parse
 *   - text/plain, text/csv → utf-8 decode
 *   - image/* → HuggingFace TrOCR via Inference API (when HF token set);
 *     otherwise returns an instruction to OCR on the client side.
 *
 * Used by the pipeline orchestrator. Client-side Tesseract.js stays
 * available for instant feedback during interactive uploads.
 */

const TROCR_MODEL = "microsoft/trocr-base-printed";

export interface OcrResult {
  text: string;
  pages?: number;
  mimeType: string;
  byteSize: number;
  /** Where the text came from. */
  source: "pdf_parse" | "text_decode" | "hf_trocr" | "client_provided";
}

/**
 * Fetch the document by URL, identify the type, extract raw text.
 *
 * Returns the extracted text plus metadata.
 */
export async function extractTextFromDocument(
  fileUrl: string,
  hint?: { contentType?: string; clientText?: string },
): Promise<OcrResult> {
  // Client already OCR'd? Use their text directly.
  if (hint?.clientText && hint.clientText.trim().length >= 10) {
    return {
      text: hint.clientText,
      mimeType: hint.contentType ?? "text/plain",
      byteSize: hint.clientText.length,
      source: "client_provided",
    };
  }

  // data: URL (legacy base64 path)
  if (fileUrl.startsWith("data:")) {
    return extractFromDataUrl(fileUrl);
  }

  // Fetch the blob
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch blob (HTTP ${res.status})`);

  const contentType = hint?.contentType ?? res.headers.get("content-type") ?? "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());

  return extractFromBuffer(buf, contentType, fileUrl);
}

async function extractFromDataUrl(dataUrl: string): Promise<OcrResult> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { text: "", mimeType: "text/plain", byteSize: 0, source: "text_decode" };
  }
  const [, mime, b64] = match;
  const buf = Buffer.from(b64, "base64");
  return extractFromBuffer(buf, mime, dataUrl);
}

async function extractFromBuffer(buf: Buffer, contentType: string, sourceUrl: string): Promise<OcrResult> {
  const mime = contentType.toLowerCase();

  if (mime.includes("pdf")) {
    const pdfMod = await import("pdf-parse");
    const pdfParse = (pdfMod as unknown as { default?: (b: Buffer) => Promise<{ text: string; numpages?: number }> }).default
      ?? (pdfMod as unknown as (b: Buffer) => Promise<{ text: string; numpages?: number }>);
    const out = await pdfParse(buf);
    return {
      text: out.text ?? "",
      pages: out.numpages,
      mimeType: "application/pdf",
      byteSize: buf.byteLength,
      source: "pdf_parse",
    };
  }

  if (mime.startsWith("text/") || mime.includes("csv")) {
    return {
      text: buf.toString("utf-8"),
      mimeType: contentType,
      byteSize: buf.byteLength,
      source: "text_decode",
    };
  }

  if (mime.startsWith("image/")) {
    const text = await ocrImageWithHF(buf, sourceUrl);
    return {
      text,
      mimeType: contentType,
      byteSize: buf.byteLength,
      source: "hf_trocr",
    };
  }

  throw new Error(`Unsupported content type for OCR: ${contentType}`);
}

/**
 * OCR an image using HuggingFace TrOCR. Returns empty string when no
 * HUGGINGFACE_API_KEY is set — caller should fall back to client-side OCR
 * (which is what AiAccountant does already).
 */
async function ocrImageWithHF(buf: Buffer, sourceUrl: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image OCR requires HUGGINGFACE_API_KEY on the server. " +
      "Use the client-side Tesseract path (drop image on /client) for now, " +
      `or set the env var. (source: ${sourceUrl.slice(0, 60)})`
    );
  }

  const res = await fetch(`https://api-inference.huggingface.co/models/${TROCR_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(buf),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TrOCR failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (typeof data?.generated_text === "string") return data.generated_text;
  return "";
}
