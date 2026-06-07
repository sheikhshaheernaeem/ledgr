import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { transaction: true } } },
  });
  if (!reconciliation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unmatched = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      reconciliationItems: { none: {} },
      date: { lte: reconciliation.statementDate },
    },
  });

  const suggestions: Array<{ transactionId: string; matchedAmount: number; confidence: number; reason: string }> = [];

  for (const item of reconciliation.items.filter(i => !i.matched)) {
    const exactMatch = unmatched.find(t => Math.abs(Math.abs(t.amount) - Math.abs(item.statementAmount)) < 0.01);
    if (exactMatch) {
      suggestions.push({ transactionId: exactMatch.id, matchedAmount: exactMatch.amount, confidence: 95, reason: "Exact amount match" });
      continue;
    }
    const closeMatch = unmatched.find(t => Math.abs(Math.abs(t.amount) - Math.abs(item.statementAmount)) < 1.00);
    if (closeMatch) {
      suggestions.push({ transactionId: closeMatch.id, matchedAmount: closeMatch.amount, confidence: 60, reason: "Near amount match (within $1)" });
    }
  }

  return NextResponse.json({ suggestions });
}
