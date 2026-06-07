import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const entity = await prisma.entity.findFirst({
    where: { id, userId: session.user.id },
    include: { parent: true, children: true },
  });

  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entity);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const entity = await prisma.entity.findFirst({ where: { id, userId: session.user.id } });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { name, code, type, parentId, currency, taxId, address, isActive } = body;

  const updated = await prisma.entity.update({
    where: { id },
    data: {
      name: name ?? entity.name,
      code: code ? code.toUpperCase() : entity.code,
      type: type ?? entity.type,
      parentId: parentId !== undefined ? parentId : entity.parentId,
      currency: currency ?? entity.currency,
      taxId: taxId !== undefined ? taxId : entity.taxId,
      address: address !== undefined ? address : entity.address,
      isActive: isActive !== undefined ? isActive : entity.isActive,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const entity = await prisma.entity.findFirst({ where: { id, userId: session.user.id } });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.entity.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
