import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const workpaper = await prisma.workpaper.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  if (!workpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workpaper);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const existing = await prisma.workpaper.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, status, assignedTo, dueDate } = body as {
    name?: string;
    description?: string;
    status?: string;
    assignedTo?: string;
    dueDate?: string | null;
  };

  const updated = await prisma.workpaper.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(assignedTo !== undefined && { assignedTo }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const existing = await prisma.workpaper.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade delete items first
  await prisma.workpaperItem.deleteMany({ where: { workpaperId: id } });
  await prisma.workpaper.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
