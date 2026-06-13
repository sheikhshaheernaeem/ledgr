import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function gate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const userId = session.user.id as string;
  const task = await prisma.firmTask.findUnique({ where: { id } });
  if (!task) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (task.ownerId !== userId && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId, task };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const key of ["title", "description", "status", "priority", "category", "clientId"]) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }
  if (body.dueAt !== undefined) allowed.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.status === "DONE" && !g.task.completedAt) allowed.completedAt = new Date();
  if (body.status && body.status !== "DONE") allowed.completedAt = null;

  const updated = await prisma.firmTask.update({ where: { id }, data: allowed });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  await prisma.firmTask.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
