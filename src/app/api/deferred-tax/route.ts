import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.deferredTaxItem.findMany({
    where: { userId: session.user.id },
    orderBy: { period: "desc" },
  });

  const totals = {
    totalAssets: items.filter(i => i.type === "ASSET").reduce((s, i) => s + i.deferredAmount, 0),
    totalLiabilities: items.filter(i => i.type === "LIABILITY").reduce((s, i) => s + i.deferredAmount, 0),
  };

  return NextResponse.json({ items, totals, netDeferredTax: totals.totalAssets - totals.totalLiabilities });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, description, bookValue, taxValue, taxRate, period } = body;

  const bv = parseFloat(bookValue);
  const tv = parseFloat(taxValue);
  const rate = parseFloat(taxRate || "0.21");
  const tempDiff = bv - tv;
  const deferredAmount = Math.abs(tempDiff * rate);

  const item = await prisma.deferredTaxItem.create({
    data: {
      userId: session.user.id,
      name,
      type: type || "ASSET",
      description: description || null,
      bookValue: bv,
      taxValue: tv,
      temporaryDiff: tempDiff,
      taxRate: rate,
      deferredAmount,
      period: new Date(period),
    },
  });

  return NextResponse.json(item, { status: 201 });
}
