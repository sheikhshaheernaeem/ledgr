import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { status?: string; title?: string; amount?: number; notes?: string };
  const event = await prisma.taxCalendarEvent.findFirst({ where: { id, userId: session.user.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.taxCalendarEvent.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const event = await prisma.taxCalendarEvent.findFirst({ where: { id, userId: session.user.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.taxCalendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
