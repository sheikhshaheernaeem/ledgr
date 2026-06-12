import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB cap when storing in DB as base64

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

  const buf = Buffer.from(await file.arrayBuffer());
  const content = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;

  const doc = await prisma.document.create({
    data: {
      userId,
      name: file.name,
      type: type.toUpperCase(),
      mimeType: file.type || "application/octet-stream",
      content,
      notes,
      status: "ACTIVE",
    },
    select: { id: true, name: true, type: true, mimeType: true, status: true, createdAt: true, notes: true },
  });

  return NextResponse.json(doc, { status: 201 });
}
