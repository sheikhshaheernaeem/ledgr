import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const assets = await prisma.fixedAsset.findMany({
    where: { userId },
    include: {
      depreciationEntries: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const {
    name,
    assetNumber,
    description,
    purchaseDate,
    purchaseCost,
    salvageValue,
    usefulLifeMonths,
    depreciationMethod,
    assetAccountCode,
    depnAccountCode,
    expenseAccountCode,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!purchaseDate) return NextResponse.json({ error: "purchaseDate is required" }, { status: 400 });
  if (purchaseCost == null || isNaN(Number(purchaseCost))) return NextResponse.json({ error: "purchaseCost is required" }, { status: 400 });
  if (!usefulLifeMonths || isNaN(Number(usefulLifeMonths))) return NextResponse.json({ error: "usefulLifeMonths is required" }, { status: 400 });

  const asset = await prisma.fixedAsset.create({
    data: {
      userId,
      name: name.trim(),
      assetNumber: assetNumber?.trim() || null,
      description: description?.trim() || null,
      purchaseDate: new Date(purchaseDate),
      purchaseCost: Number(purchaseCost),
      salvageValue: Number(salvageValue ?? 0),
      usefulLifeMonths: Number(usefulLifeMonths),
      depreciationMethod: depreciationMethod ?? "STRAIGHT_LINE",
      assetAccountCode: assetAccountCode?.trim() || null,
      depnAccountCode: depnAccountCode?.trim() || null,
      expenseAccountCode: expenseAccountCode?.trim() || null,
    },
    include: { depreciationEntries: true },
  });

  return NextResponse.json(asset, { status: 201 });
}
