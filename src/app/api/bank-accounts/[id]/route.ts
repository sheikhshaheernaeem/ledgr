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

  const existing = await prisma.bankAccount.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, accountType, institutionName, lastFourDigits, currency, currentBalance } = body;

  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      name: name ?? undefined,
      accountType: accountType ?? undefined,
      institutionName: institutionName ?? undefined,
      lastFourDigits: lastFourDigits ?? undefined,
      currency: currency ?? undefined,
      currentBalance: currentBalance ?? undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "BankAccount",
    entityId: id,
    before: existing,
    after: updated,
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

  const existing = await prisma.bankAccount.findFirst({
    where: { id, userId: session.user.id },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing._count.transactions > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete account with existing transactions. Remove transactions first.",
      },
      { status: 409 }
    );
  }

  await prisma.bankAccount.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "BankAccount",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
