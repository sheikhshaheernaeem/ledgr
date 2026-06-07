import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const [transactions, invoices, bills, fixedAssets, depreciationEntries, bankAccounts] =
    await Promise.all([
      // APPROVED transactions only (exclude PENDING)
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: yearStart, lte: yearEnd },
          status: "APPROVED",
        },
        select: { amount: true, type: true },
      }),

      // All invoices to compute AR change (unpaid = outstanding)
      prisma.invoice.findMany({
        where: { userId },
        select: { total: true, amountPaid: true, status: true },
      }),

      // All bills to compute AP change (PENDING = outstanding)
      prisma.bill.findMany({
        where: { userId, status: "PENDING" },
        select: { total: true, amountPaid: true },
      }),

      // Fixed assets purchased in the year (investing outflow)
      prisma.fixedAsset.findMany({
        where: { userId, purchaseDate: { gte: yearStart, lte: yearEnd } },
        select: { purchaseCost: true },
      }),

      // Depreciation entries posted in the year (non-cash add-back)
      prisma.depreciationEntry.findMany({
        where: { userId, year, posted: true },
        select: { amount: true },
      }),

      // Bank accounts for opening/closing cash
      prisma.bankAccount.findMany({
        where: { userId },
        select: { currentBalance: true },
      }),
    ]);

  // ─── Net Income ──────────────────────────────────────────────────────────────
  // credits (income) minus debits (expenses) from APPROVED transactions in the year
  const credits = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + t.amount, 0);
  const debits = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);
  const netIncome = credits - debits;

  // ─── Depreciation (non-cash add-back) ───────────────────────────────────────
  const depreciation = depreciationEntries.reduce((s, e) => s + e.amount, 0);

  // ─── Change in Accounts Receivable ──────────────────────────────────────────
  // SENT invoices: outstanding amount = total - amountPaid
  // Increase in AR = more cash not yet collected = negative cash effect
  const outstandingAR = invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const changeInAR = -outstandingAR; // negative = cash tied up in receivables

  // ─── Change in Accounts Payable ──────────────────────────────────────────────
  // PENDING bills: outstanding amount = total - amountPaid
  // Increase in AP = cash not yet paid out = positive cash effect
  const outstandingAP = bills.reduce((s, b) => s + (b.total - b.amountPaid), 0);
  const changeInAP = outstandingAP; // positive = payables not yet paid (cash still in hand)

  // ─── Operating Cash Flow ────────────────────────────────────────────────────
  const operatingCashFlow = netIncome + depreciation + changeInAR + changeInAP;

  // ─── Investing Activities ───────────────────────────────────────────────────
  // Fixed asset purchases are cash outflows (negative)
  const investing = -fixedAssets.reduce((s, a) => s + a.purchaseCost, 0);

  // ─── Financing Activities ───────────────────────────────────────────────────
  const financing = 0;

  // ─── Net Change ─────────────────────────────────────────────────────────────
  const netChange = operatingCashFlow + investing + financing;

  // ─── Cash Balances ──────────────────────────────────────────────────────────
  // Closing cash = current sum of all bank account balances
  const closingCash = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  // Opening cash derived by reversing the net change
  const openingCash = closingCash - netChange;

  return NextResponse.json({
    period: { year },
    netIncome: Math.round(netIncome * 100) / 100,
    depreciation: Math.round(depreciation * 100) / 100,
    changeInAR: Math.round(changeInAR * 100) / 100,
    changeInAP: Math.round(changeInAP * 100) / 100,
    operatingCashFlow: Math.round(operatingCashFlow * 100) / 100,
    investing: Math.round(investing * 100) / 100,
    financing,
    netChange: Math.round(netChange * 100) / 100,
    openingCash: Math.round(openingCash * 100) / 100,
    closingCash: Math.round(closingCash * 100) / 100,
  });
}
