import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const hook = await prisma.webhook.findFirst({ where: { id, userId: session.user.id } });
  if (!hook) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as { url?: string; events?: string[]; isActive?: boolean; description?: string };
  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      ...(body.url && { url: body.url }),
      ...(body.events && { events: JSON.stringify(body.events) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const hook = await prisma.webhook.findFirst({ where: { id, userId: session.user.id } });
  if (!hook) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
