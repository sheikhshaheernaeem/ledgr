/**
 * Unified file storage abstraction.
 *
 * Tries Vercel Blob first (when BLOB_READ_WRITE_TOKEN is set) — proper
 * S3-compatible storage, public or private URLs, files served from edge.
 *
 * Falls back to base64-in-DB when no Blob token is configured. Same API
 * either way — callers don't need to care which backend is active.
 */

import { put } from "@vercel/blob";

export interface StoredFile {
  /** A URL that can be fetched to retrieve the file (or a "db:" URL for base64). */
  url: string;
  /** Provider that handled the upload. */
  provider: "vercel_blob" | "db_base64";
  /** Bytes. */
  size: number;
  /** Original MIME type. */
  contentType: string;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Store a file. Returns a URL that other parts of the system can use to
 * later retrieve it (or persist into a DB column).
 *
 * pathPrefix is used to namespace blobs (e.g. "userId/documents").
 */
export async function storeFile(
  file: File | Buffer,
  filename: string,
  pathPrefix: string,
  contentType: string,
): Promise<StoredFile> {
  const buf: Buffer = Buffer.isBuffer(file)
    ? (file as Buffer)
    : Buffer.from(await (file as File).arrayBuffer());

  if (isBlobConfigured()) {
    const path = `${pathPrefix}/${Date.now()}-${sanitizeFilename(filename)}`;
    const blob = await put(path, buf, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, provider: "vercel_blob", size: buf.byteLength, contentType };
  }

  // Fallback: base64 in DB. Caller is responsible for persisting.
  // The "url" is an opaque marker — callers should resolve via Document.id.
  const base64 = buf.toString("base64");
  return {
    url: `db:base64:${base64}`,
    provider: "db_base64",
    size: buf.byteLength,
    contentType,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
