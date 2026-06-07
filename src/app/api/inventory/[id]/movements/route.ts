import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.inventoryItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const movements = await prisma.inventoryMovement.findMany({
    where: { itemId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(movements);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.inventoryItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { date, type, quantity, unitCost, reference, notes } = body;

  const qty = parseFloat(quantity);
  const cost = parseFloat(unitCost || String(item.costPrice));
  const totalCost = qty * cost;

  // Update quantity on hand
  const qtyChange = type === "SALE" || type === "ADJUSTMENT_OUT" ? -qty : qty;

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        itemId: id,
        userId: session.user.id,
        date: new Date(date),
        type,
        quantity: qty,
        unitCost: cost,
        totalCost,
        reference: reference || null,
        notes: notes || null,
      },
    }),
    prisma.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: { increment: qtyChange } },
    }),
  ]);

  return NextResponse.json(movement, { status: 201 });
}
