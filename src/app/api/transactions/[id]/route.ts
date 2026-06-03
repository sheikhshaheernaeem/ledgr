import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    category,
    subcategory,
    status,
    taxCategory,
    taxLine,
    bankAccountId,
    invoiceId,
    notes,
  } = body;

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      category: category ?? undefined,
      subcategory: subcategory ?? undefined,
      status: status ?? undefined,
      taxCategory: taxCategory ?? undefined,
      taxLine: taxLine ?? undefined,
      bankAccountId: bankAccountId ?? undefined,
      invoiceId: invoiceId ?? undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Transaction",
    entityId: id,
    before: existing,
    after: updated,
    transactionId: id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Transaction",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
