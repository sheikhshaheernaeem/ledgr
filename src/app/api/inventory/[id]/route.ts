import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.inventoryItem.findFirst({
    where: { id, userId: session.user.id },
    include: { movements: { orderBy: { date: "desc" } } },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.inventoryItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: body.name ?? item.name,
      description: body.description !== undefined ? body.description : item.description,
      category: body.category !== undefined ? body.category : item.category,
      unitOfMeasure: body.unitOfMeasure ?? item.unitOfMeasure,
      costMethod: body.costMethod ?? item.costMethod,
      costPrice: body.costPrice !== undefined ? parseFloat(body.costPrice) : item.costPrice,
      sellPrice: body.sellPrice !== undefined ? parseFloat(body.sellPrice) : item.sellPrice,
      reorderPoint: body.reorderPoint !== undefined ? parseFloat(body.reorderPoint) : item.reorderPoint,
      reorderQty: body.reorderQty !== undefined ? parseFloat(body.reorderQty) : item.reorderQty,
      isActive: body.isActive !== undefined ? body.isActive : item.isActive,
      assetAccountCode: body.assetAccountCode !== undefined ? body.assetAccountCode : item.assetAccountCode,
      cogsAccountCode: body.cogsAccountCode !== undefined ? body.cogsAccountCode : item.cogsAccountCode,
      revenueAccountCode: body.revenueAccountCode !== undefined ? body.revenueAccountCode : item.revenueAccountCode,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.inventoryItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
