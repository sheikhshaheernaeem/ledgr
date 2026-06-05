import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({
    where: { id, userId },
    include: { depreciationEntries: true },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { year, month } = body as { year: number; month: number };

  if (!year || !month) return NextResponse.json({ error: "year and month are required" }, { status: 400 });

  // Calculate current book value
  const totalDepreciated = asset.depreciationEntries.reduce((sum, e) => sum + e.amount, 0);
  const currentBookValue = asset.purchaseCost - totalDepreciated;

  // Check if fully depreciated
  if (currentBookValue <= asset.salvageValue) {
    return NextResponse.json({ error: "Asset fully depreciated" }, { status: 400 });
  }

  // Check if entry already exists for this period
  const existing = asset.depreciationEntries.find((e) => e.year === year && e.month === month);
  if (existing) {
    return NextResponse.json({ error: "Depreciation already recorded for this period" }, { status: 400 });
  }

  // Straight-line monthly depreciation
  const monthlyDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths;

  // Don't depreciate below salvage value
  let amount = monthlyDepreciation;
  if (currentBookValue - monthlyDepreciation <= asset.salvageValue) {
    amount = currentBookValue - asset.salvageValue;
  }

  const newBookValue = currentBookValue - amount;

  const entry = await prisma.depreciationEntry.create({
    data: {
      assetId: id,
      userId,
      month,
      year,
      amount,
      bookValue: newBookValue,
    },
  });

  // If book value now equals salvage value, mark asset as fully depreciated
  if (newBookValue <= asset.salvageValue) {
    await prisma.fixedAsset.update({
      where: { id },
      data: { status: "FULLY_DEPRECIATED" },
    });
  }

  return NextResponse.json(entry, { status: 201 });
}
