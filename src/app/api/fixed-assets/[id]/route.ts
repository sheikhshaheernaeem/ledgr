import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({
    where: { id, userId },
    include: {
      depreciationEntries: { orderBy: [{ year: "asc" }, { month: "asc" }] },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({ where: { id, userId } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, status, assetAccountCode, depnAccountCode, expenseAccountCode, assetNumber } = body;

  const updated = await prisma.fixedAsset.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(status !== undefined && { status }),
      ...(assetAccountCode !== undefined && { assetAccountCode: assetAccountCode.trim() || null }),
      ...(depnAccountCode !== undefined && { depnAccountCode: depnAccountCode.trim() || null }),
      ...(expenseAccountCode !== undefined && { expenseAccountCode: expenseAccountCode.trim() || null }),
      ...(assetNumber !== undefined && { assetNumber: assetNumber.trim() || null }),
    },
    include: { depreciationEntries: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({
    where: { id, userId },
    include: { depreciationEntries: true },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (asset.status !== "ACTIVE") return NextResponse.json({ error: "Only ACTIVE assets can be deleted" }, { status: 400 });

  const hasPosted = asset.depreciationEntries.some((e) => e.posted);
  if (hasPosted) return NextResponse.json({ error: "Cannot delete: asset has posted depreciation entries" }, { status: 400 });

  await prisma.fixedAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
