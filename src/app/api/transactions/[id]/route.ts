import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

async function canActOnTransaction(sessionUserId: string, role: string | undefined, txUserId: string) {
  if (txUserId === sessionUserId) return true;
  if (role === "ADMIN" || role === "QA") return true;
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: sessionUserId, clientId: txUserId } },
    });
    return mc?.isActive === true;
  }
  return false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;

  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canActOnTransaction(sessionUserId, role, existing.userId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Period lock check on existing transaction date (owner's locks)
  const txYear = existing.date.getFullYear();
  const txMonth = existing.date.getMonth() + 1;
  const lock = await prisma.lockedPeriod.findFirst({
    where: { userId: existing.userId, year: txYear, month: txMonth },
  });
  if (lock) {
    return NextResponse.json(
      { error: "This period is locked. Unlock it first to edit transactions." },
      { status: 400 }
    );
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
    userId: sessionUserId,
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
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;

  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canActOnTransaction(sessionUserId, role, existing.userId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.transaction.delete({ where: { id } });

  await writeAudit({
    userId: sessionUserId,
    action: "DELETE",
    entityType: "Transaction",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
