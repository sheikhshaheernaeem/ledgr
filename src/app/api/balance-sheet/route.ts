import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all APPROVED transactions up to today
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      date: { lte: now },
    },
    select: {
      amount: true,
      type: true,
      category: true,
      date: true,
    },
  });

  // Cash: sum of all CREDIT - sum of all DEBIT
  const totalCredits = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const cash = totalCredits - totalDebits;

  // Accounts Receivable: sum of total on SENT + OVERDUE invoices
  const arInvoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["SENT", "OVERDUE"] },
    },
    select: { total: true },
  });

  const accountsReceivable = arInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const totalAssets = cash + accountsReceivable;

  // Accounts Payable: sum of DEBIT transactions in Professional Services or Banking & Fees in last 30 days
  const apTransactions = transactions.filter(
    (t) =>
      t.type === "DEBIT" &&
      (t.category === "Professional Services" || t.category === "Banking & Fees") &&
      new Date(t.date) >= thirtyDaysAgo
  );

  const accountsPayable = apTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalLiabilities = accountsPayable;

  const equity = totalAssets - totalLiabilities;

  return NextResponse.json({
    asOf: now.toISOString(),
    assets: {
      cash: parseFloat(cash.toFixed(2)),
      accountsReceivable: parseFloat(accountsReceivable.toFixed(2)),
      total: parseFloat(totalAssets.toFixed(2)),
    },
    liabilities: {
      accountsPayable: parseFloat(accountsPayable.toFixed(2)),
      total: parseFloat(totalLiabilities.toFixed(2)),
    },
    equity: parseFloat(equity.toFixed(2)),
  });
}
