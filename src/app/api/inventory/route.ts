import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { movements: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { sku, name, description, category, unitOfMeasure, costMethod, costPrice, sellPrice, quantityOnHand, reorderPoint, reorderQty, assetAccountCode, cogsAccountCode, revenueAccountCode } = body;

    if (!sku || !name) return NextResponse.json({ error: "SKU and name are required" }, { status: 400 });

    const item = await prisma.inventoryItem.create({
      data: {
        userId: session.user.id,
        sku,
        name,
        description: description || null,
        category: category || null,
        unitOfMeasure: unitOfMeasure || "EACH",
        costMethod: costMethod || "FIFO",
        costPrice: parseFloat(costPrice || "0"),
        sellPrice: parseFloat(sellPrice || "0"),
        quantityOnHand: parseFloat(quantityOnHand || "0"),
        reorderPoint: reorderPoint ? parseFloat(reorderPoint) : null,
        reorderQty: reorderQty ? parseFloat(reorderQty) : null,
        assetAccountCode: assetAccountCode || null,
        cogsAccountCode: cogsAccountCode || null,
        revenueAccountCode: revenueAccountCode || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
