/**
 * POST /api/upload
 *
 * Spec'd entry point: upload a file → store in Blob → create Document
 * record → trigger pipeline asynchronously (waitUntil) → return
 * immediately.
 *
 * Body: multipart with "file" (and optional "type", "clientText").
 * Response: { documentId, status: "processing" }
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage/blob";
import { processDocument } from "@/lib/pipeline/processDocument";
import { checkLimit, getUpgradeOptions } from "@/lib/usageTracker";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // ── Enforce per-tier document limit BEFORE we accept the upload ──
  const limit = await checkLimit(userId, "documents");
  if (!limit.allowed) {
    const upgrade_options = getUpgradeOptions(limit.tier);
    return NextResponse.json(
      {
        error: "limit_reached",
        message: limit.reason ?? "Document limit reached for your plan.",
        tier: limit.tier,
        used: limit.used,
        limit: limit.limit === Infinity ? null : limit.limit,
        upgrade_options,
      },
      { status: 402 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const docType = (form.get("type") as string | null) ?? "OTHER";
  const clientText = (form.get("clientText") as string | null) ?? undefined;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, { status: 413 });
  }

  const contentType = file.type || "application/octet-stream";

  // 1. Upload to Blob (or base64 fallback)
  const stored = await uploadFile(file, file.name, userId, contentType);

  // 2. Create Document row
  const doc = await prisma.document.create({
    data: {
      userId,
      name: file.name,
      type: docType.toUpperCase(),
      mimeType: contentType,
      fileUrl: stored.provider === "vercel_blob" ? stored.url : null,
      content: stored.provider === "db_base64" ? stored.url : null,
      storageProvider: stored.provider,
      fileSize: stored.size,
      status: "UPLOADED",
    },
    select: { id: true, status: true },
  });

  // 3. Trigger pipeline in background — response returns immediately
  waitUntil(
    processDocument(doc.id, { clientText }).catch((err) => {
      console.error(`[upload] pipeline failed for doc ${doc.id}:`, err);
    }),
  );

  return NextResponse.json({
    documentId: doc.id,
    status: "processing",
    pollUrl: `/api/process?documentId=${doc.id}`,
  });
}
