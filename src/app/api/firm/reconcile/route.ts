import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const userId = session.user.id as string;
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: userId, clientId: targetUserId } },
    });
    if (!mc?.isActive) return { error: NextResponse.json({ error: "Not your client" }, { status: 403 }) };
  }
  return { userId };
}

// GET /api/firm/reconcile?clientId=...
// Returns: per-bank-account monthly reconciliation status (current + last 5 months)
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const g = await operatorGate(clientId);
  if ("error" in g) return g.error;

  const [accounts, recs, txnsLast6Mo] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId: clientId },
      select: { id: true, name: true, accountType: true, currentBalance: true, currency: true, lastFourDigits: true },
    }),
    prisma.reconciliation.findMany({
      where: { userId: clientId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, bankAccountId: true, statementDate: true, status: true,
        statementBalance: true, createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: clientId, date: { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } },
      select: { bankAccountId: true, reconciled: true, type: true, amount: true, date: true },
    }),
  ]);

  // Build monthly status per account
  const months: Array<{ year: number; month: number }> = [];
   
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  type AccStatus = {
    account: typeof accounts[number];
    monthly: Array<{
      year: number; month: number;
      reconciliationId: string | null;
      status: string;
      txnCount: number;
      reconciledCount: number;
    }>;
  };

  const result: AccStatus[] = accounts.map((acc) => {
    const monthly = months.map(({ year, month }) => {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const monthTxns = txnsLast6Mo.filter(
        (t) => t.bankAccountId === acc.id && t.date >= monthStart && t.date <= monthEnd
      );
      const reconciledCount = monthTxns.filter((t) => t.reconciled).length;
      const rec = recs.find(
        (r) => r.bankAccountId === acc.id && r.statementDate && r.statementDate >= monthStart && r.statementDate <= monthEnd
      );
      return {
        year, month,
        reconciliationId: rec?.id ?? null,
        status: rec?.status ?? (monthTxns.length === 0 ? "NO_DATA" : reconciledCount === monthTxns.length ? "READY" : "IN_PROGRESS"),
        txnCount: monthTxns.length,
        reconciledCount,
      };
    });
    return { account: acc, monthly };
  });

  return NextResponse.json({ accounts: result });
}
