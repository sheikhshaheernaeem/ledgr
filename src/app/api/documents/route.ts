import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const docs = await prisma.document.findMany({
    where: { userId },
    include: { client: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { name, type, content, mimeType, clientId, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const doc = await prisma.document.create({
    data: {
      userId,
      name: name.trim(),
      type: type ?? "OTHER",
      content: content ?? null,
      mimeType: mimeType ?? "text/plain",
      clientId: clientId || null,
      notes: notes ?? null,
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return NextResponse.json(doc, { status: 201 });
}
