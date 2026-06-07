import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rule = await prisma.sodRule.findFirst({ where: { id, userId: session.user.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.sodRule.update({
    where: { id },
    data: {
      name: body.name ?? rule.name,
      description: body.description !== undefined ? body.description : rule.description,
      action1: body.action1 ?? rule.action1,
      action2: body.action2 ?? rule.action2,
      isActive: body.isActive !== undefined ? body.isActive : rule.isActive,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rule = await prisma.sodRule.findFirst({ where: { id, userId: session.user.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sodRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
