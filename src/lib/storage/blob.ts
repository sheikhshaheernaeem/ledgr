/**
 * Vercel Blob storage helpers — single source of truth for file uploads.
 *
 * Removes base64-in-DB for new uploads. Legacy records keep working via the
 * `storageProvider` column check elsewhere.
 */

import { put, head, del } from "@vercel/blob";
import { prisma } from "@/lib/db";

const HAS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export interface UploadedFile {
  url: string;
  size: number;
  contentType: string;
  provider: "vercel_blob" | "db_base64";
}

/**
 * Upload a file to Vercel Blob. Returns the public URL.
 *
 * Falls back to base64-in-DB when BLOB_READ_WRITE_TOKEN is not configured —
 * lets the system work in any env without manual setup.
 */
export async function uploadFile(
  file: File | Buffer,
  filename: string,
  userId: string,
  contentType: string,
): Promise<UploadedFile> {
  const buf: Buffer = Buffer.isBuffer(file)
    ? (file as Buffer)
    : Buffer.from(await (file as File).arrayBuffer());

  if (HAS_BLOB) {
    const path = `${userId}/documents/${Date.now()}-${sanitize(filename)}`;
    const blob = await put(path, buf, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, size: buf.byteLength, contentType, provider: "vercel_blob" };
  }

  // Fallback: base64 marker. Caller responsible for storing the actual content
  // in the Document.content column.
  const base64 = buf.toString("base64");
  return {
    url: `data:${contentType};base64,${base64}`,
    size: buf.byteLength,
    contentType,
    provider: "db_base64",
  };
}

/**
 * Resolve a Document's stored URL. Works for both Blob-backed and legacy
 * base64-backed documents.
 */
export async function getFileUrl(documentId: string): Promise<string | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { fileUrl: true, content: true, storageProvider: true },
  });
  if (!doc) return null;
  if (doc.storageProvider === "vercel_blob" && doc.fileUrl) return doc.fileUrl;
  if (doc.content) return doc.content; // data: URL
  return null;
}

/**
 * Delete a blob by URL. No-op for legacy base64 records.
 */
export async function deleteBlob(url: string): Promise<void> {
  if (!HAS_BLOB || !url.startsWith("http")) return;
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.warn("[storage/blob] delete failed:", err);
  }
}

/**
 * Probe a blob URL for metadata. Useful for diagnostics.
 */
export async function probeBlob(url: string) {
  if (!HAS_BLOB) return null;
  try {
    return await head(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    return null;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
