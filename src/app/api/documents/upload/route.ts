import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeFile, isBlobConfigured } from "@/lib/file-storage";

// 8MB cap. With blob enabled, larger files are practical, but we keep this
// modest to avoid runaway costs on a YC prototype.
const MAX_SIZE = 8 * 1024 * 1024;

export const runtime = "nodejs";

/**
 * POST /api/documents/upload (multipart)
 *
 * Stores the file via the storage abstraction:
 *   - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production-ready)
 *   - base64 in DB as fallback (works on bare Vercel without Blob)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = (form.get("type") as string) || "OTHER";
  const notes = (form.get("notes") as string) || null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  let stored;
  try {
    stored = await storeFile(file, file.name, `${userId}/documents`, mimeType);
  } catch (err) {
    console.error("[documents/upload] storeFile failed:", err);
    return NextResponse.json({ error: "Storage failed — try again" }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      userId,
      name: file.name,
      type: type.toUpperCase(),
      mimeType,
      content: stored.provider === "db_base64" ? `data:${mimeType};base64,${stored.url.replace(/^db:base64:/, "")}` : null,
      fileUrl: stored.provider === "vercel_blob" ? stored.url : null,
      storageProvider: stored.provider,
      fileSize: stored.size,
      notes,
      status: "ACTIVE",
    },
    select: {
      id: true, name: true, type: true, mimeType: true,
      status: true, createdAt: true, notes: true,
      fileUrl: true, storageProvider: true, fileSize: true,
    },
  });

  return NextResponse.json({ ...doc, blobEnabled: isBlobConfigured() }, { status: 201 });
}
