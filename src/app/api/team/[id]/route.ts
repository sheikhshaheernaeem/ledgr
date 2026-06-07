import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { role?: string; isActive?: boolean };
  const m = await prisma.teamMember.findFirst({ where: { id, ownerId: session.user.id } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.teamMember.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await prisma.teamMember.findFirst({ where: { id, ownerId: session.user.id } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
