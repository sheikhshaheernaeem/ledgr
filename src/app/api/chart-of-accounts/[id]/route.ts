import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const account = await prisma.chartOfAccount.findFirst({ where: { id, userId } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, subtype, parentCode, isActive } = body;

  const updated = await prisma.chartOfAccount.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(subtype !== undefined && { subtype }),
      ...(parentCode !== undefined && { parentCode }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const account = await prisma.chartOfAccount.findFirst({ where: { id, userId } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block delete if account has journal lines
  const lineCount = await prisma.journalEntryLine.count({ where: { accountId: id } });
  if (lineCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete account with existing journal entries. Deactivate it instead." },
      { status: 409 }
    );
  }

  // Soft delete
  const updated = await prisma.chartOfAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(updated);
}
