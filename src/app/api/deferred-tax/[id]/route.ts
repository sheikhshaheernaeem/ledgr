import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.deferredTaxItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const bv = body.bookValue !== undefined ? parseFloat(body.bookValue) : item.bookValue;
  const tv = body.taxValue !== undefined ? parseFloat(body.taxValue) : item.taxValue;
  const rate = body.taxRate !== undefined ? parseFloat(body.taxRate) : item.taxRate;
  const tempDiff = bv - tv;
  const deferredAmount = Math.abs(tempDiff * rate);

  const updated = await prisma.deferredTaxItem.update({
    where: { id },
    data: {
      name: body.name ?? item.name,
      type: body.type ?? item.type,
      description: body.description !== undefined ? body.description : item.description,
      bookValue: bv,
      taxValue: tv,
      temporaryDiff: tempDiff,
      taxRate: rate,
      deferredAmount,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.deferredTaxItem.findFirst({ where: { id, userId: session.user.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deferredTaxItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
