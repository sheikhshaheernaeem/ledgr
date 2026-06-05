import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id: workpaperId } = await params;

  const wp = await prisma.workpaper.findFirst({ where: { id: workpaperId, userId } });
  if (!wp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { description, reference, notes } = body as {
    description: string;
    reference?: string;
    notes?: string;
  };

  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const item = await prisma.workpaperItem.create({
    data: {
      workpaperId,
      description,
      reference: reference ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id: workpaperId } = await params;

  const wp = await prisma.workpaper.findFirst({ where: { id: workpaperId, userId } });
  if (!wp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { itemId, status, notes } = body as {
    itemId: string;
    status: string;
    notes?: string;
  };

  if (!itemId || !status) return NextResponse.json({ error: "itemId and status are required" }, { status: 400 });

  const existing = await prisma.workpaperItem.findFirst({ where: { id: itemId, workpaperId } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const userName = (session.user as { name?: string | null }).name ?? session.user.email ?? "Unknown";

  const updated = await prisma.workpaperItem.update({
    where: { id: itemId },
    data: {
      status,
      ...(notes !== undefined && { notes }),
      ...(status === "TICKED" && {
        tickedBy: userName,
        tickedAt: new Date(),
      }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id: workpaperId } = await params;

  const wp = await prisma.workpaper.findFirst({ where: { id: workpaperId, userId } });
  if (!wp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { itemId } = body as { itemId: string };

  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  const existing = await prisma.workpaperItem.findFirst({ where: { id: itemId, workpaperId } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.workpaperItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
