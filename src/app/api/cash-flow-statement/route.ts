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
  const monthParam = searchParams.get("month");
  const month = monthParam ? parseInt(monthParam, 10) : null;

  // Build date range
  let periodStart: Date;
  let periodEnd: Date;
  if (month) {
    periodStart = new Date(year, month - 1, 1);
    periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    periodStart = new Date(year, 0, 1);
    periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  const [transactions, invoices, bills, fixedAssets, depreciationEntries, reports] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: periodStart, lte: periodEnd }, status: "APPROVED" },
      select: { amount: true, type: true, category: true, description: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { total: true, status: true, paidAt: true, createdAt: true },
    }),
    prisma.bill.findMany({
      where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { total: true, status: true, paidAt: true, createdAt: true, amountPaid: true },
    }),
    prisma.fixedAsset.findMany({
      where: { userId, purchaseDate: { gte: periodStart, lte: periodEnd } },
      select: { name: true, purchaseCost: true, purchaseDate: true, disposalDate: true, disposalValue: true, status: true },
    }),
    prisma.depreciationEntry.findMany({
      where: {
        userId,
        year: month ? year : { gte: year, lte: year },
        ...(month ? { month } : {}),
        posted: true,
      },
      select: { amount: true, year: true, month: true },
    }),
    prisma.report.findMany({
      where: { userId, year, ...(month ? { month } : {}) },
      select: { totalIncome: true, totalExpenses: true, netProfit: true, month: true, year: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  // ─── Operating Activities ────────────────────────────────────────────────────

  // Net income — prefer report data, fallback to transactions
  let netIncome = 0;
  if (reports.length > 0) {
    netIncome = reports.reduce((s, r) => s + r.netProfit, 0);
  } else {
    const credits = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const debits = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    netIncome = credits - debits;
  }

  // Depreciation (non-cash add-back)
  const depreciation = depreciationEntries.reduce((s, e) => s + e.amount, 0);

  // Changes in AR: increase in AR = more unpaid invoices (negative cash)
  const newInvoices = invoices.filter((i) => i.status !== "PAID");
  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const arChange = paidInvoices.reduce((s, i) => s + i.total, 0) - newInvoices.reduce((s, i) => s + i.total, 0);

  // Changes in AP: increase in AP = more unpaid bills (positive cash temporarily)
  const newBills = bills.filter((b) => b.status !== "PAID");
  const paidBills = bills.filter((b) => b.status === "PAID");
  const apChange = newBills.reduce((s, b) => s + b.total, 0) - paidBills.reduce((s, b) => s + b.total, 0);

  const operatingTotal = netIncome + depreciation + arChange + apChange;

  // ─── Investing Activities ────────────────────────────────────────────────────

  const assetPurchases = fixedAssets.reduce((s, a) => s + a.purchaseCost, 0);
  const disposals = fixedAssets
    .filter((a) => a.disposalDate !== null && a.disposalDate >= periodStart && a.disposalDate <= periodEnd)
    .reduce((s, a) => s + (a.disposalValue ?? 0), 0);

  const investingTotal = disposals - assetPurchases;

  // ─── Financing Activities ────────────────────────────────────────────────────

  const ownerDraws = transactions
    .filter((t) => t.type === "DEBIT" && (t.category ?? "").toLowerCase().includes("owner"))
    .reduce((s, t) => s + t.amount, 0);

  const loanProceeds = transactions
    .filter(
      (t) =>
        t.type === "CREDIT" &&
        ((t.category ?? "").toLowerCase().includes("loan") ||
          (t.description ?? "").toLowerCase().includes("loan proceed"))
    )
    .reduce((s, t) => s + t.amount, 0);

  const loanPayments = transactions
    .filter(
      (t) =>
        t.type === "DEBIT" &&
        ((t.category ?? "").toLowerCase().includes("loan") ||
          (t.description ?? "").toLowerCase().includes("loan payment"))
    )
    .reduce((s, t) => s + t.amount, 0);

  const financingTotal = loanProceeds - loanPayments - ownerDraws;

  const netChange = operatingTotal + investingTotal + financingTotal;

  return NextResponse.json({
    period: { year, month, periodStart, periodEnd },
    operating: {
      netIncome,
      depreciation,
      arChange,
      apChange,
      total: operatingTotal,
      items: [
        { label: "Net Income", amount: netIncome },
        { label: "Depreciation & Amortization", amount: depreciation },
        { label: "Change in Accounts Receivable", amount: arChange },
        { label: "Change in Accounts Payable", amount: apChange },
      ],
    },
    investing: {
      assetPurchases: -assetPurchases,
      disposals,
      total: investingTotal,
      assets: fixedAssets.map((a) => ({ name: a.name, cost: a.purchaseCost, date: a.purchaseDate })),
      items: [
        { label: "Fixed Asset Purchases", amount: -assetPurchases },
        { label: "Proceeds from Asset Disposals", amount: disposals },
      ],
    },
    financing: {
      ownerDraws: -ownerDraws,
      loanProceeds,
      loanPayments: -loanPayments,
      total: financingTotal,
      items: [
        { label: "Owner's Draws", amount: -ownerDraws },
        { label: "Loan Proceeds", amount: loanProceeds },
        { label: "Loan Repayments", amount: -loanPayments },
      ],
    },
    netChange,
  });
}
