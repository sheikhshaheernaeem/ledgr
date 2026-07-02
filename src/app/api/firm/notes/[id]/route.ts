import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function gate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const note = await prisma.firmNote.findUnique({ where: { id } });
  if (!note) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { userId: session.user.id as string, role, note };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  if (g.note.authorId !== g.userId && g.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.body !== undefined) data.body = body.body;
  if (body.pinned !== undefined) data.pinned = !!body.pinned;

  const updated = await prisma.firmNote.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  if (g.note.authorId !== g.userId && g.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.firmNote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
