import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const key = await prisma.apiKey.findFirst({ where: { id, userId: session.user.id } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const key = await prisma.apiKey.findFirst({ where: { id, userId: session.user.id } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as { name?: string; scopes?: string[] };
  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.scopes && { scopes: JSON.stringify(body.scopes) }),
    },
  });
  return NextResponse.json(updated);
}
