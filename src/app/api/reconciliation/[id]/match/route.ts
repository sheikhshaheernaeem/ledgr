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

  // Verify reconciliation belongs to user
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!reconciliation) {
    return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
  }

  const body = await request.json();
  const { itemId, transactionId } = body as {
    itemId: string;
    transactionId: string;
  };

  if (!itemId || !transactionId) {
    return NextResponse.json(
      { error: "itemId and transactionId are required" },
      { status: 400 }
    );
  }

  // Verify item belongs to this reconciliation
  const item = await prisma.reconciliationItem.findFirst({
    where: { id: itemId, reconciliationId: id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Verify transaction belongs to this user
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: session.user.id },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const now = new Date();

  const updatedItem = await prisma.reconciliationItem.update({
    where: { id: itemId },
    data: {
      matched: true,
      matchedAt: now,
      transactionId,
    },
  });

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      reconciled: true,
      reconciledAt: now,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "MANUAL_MATCH",
    entityType: "ReconciliationItem",
    entityId: itemId,
    before: { matched: item.matched, transactionId: item.transactionId },
    after: { matched: true, transactionId, matchedAt: now },
    transactionId,
  });

  return NextResponse.json(updatedItem);
}
