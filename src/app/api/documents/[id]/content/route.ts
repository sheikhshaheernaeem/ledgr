import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, userId },
    select: { name: true, mimeType: true, content: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.content) return NextResponse.json({ error: "No content" }, { status: 404 });

  // Content is stored as data URL: "data:<mime>;base64,<...>"
  const match = doc.content.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // plain text or non-data-url content
    return new Response(doc.content, {
      headers: { "Content-Type": doc.mimeType || "text/plain" },
    });
  }
  const [, mime, b64] = match;
  const buf = Buffer.from(b64, "base64");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
    },
  });
}
