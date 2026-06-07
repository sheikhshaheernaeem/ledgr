import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Categories treated as COGS
const COGS_CATEGORIES = new Set([
  "Cost of Goods",
  "Cost of Goods Sold",
  "Cost of Sales",
  "COGS",
  "Direct Costs",
  "Direct Cost",
]);

interface CategoryBreakdown {
  [category: string]: number;
}

interface PLData {
  revenue: { total: number; byCategory: CategoryBreakdown };
  cogs: { total: number; byCategory: CategoryBreakdown };
  grossProfit: number;
  grossMargin: number;
  expenses: { total: number; byCategory: CategoryBreakdown };
  netIncome: number;
  netMargin: number;
  months: MonthData[];
}

interface MonthData {
  month: number;
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
}

async function getPLData(
  userId: string,
  year: number,
  month?: number
): Promise<PLData> {
  const startDate = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1);
  const endDate = month
    ? new Date(year, month, 0, 23, 59, 59, 999)
    : new Date(year, 11, 31, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      status: { in: ["APPROVED", "PENDING"] },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  const revenue: CategoryBreakdown = {};
  const cogsBreakdown: CategoryBreakdown = {};
  const expenses: CategoryBreakdown = {};

  for (const tx of transactions) {
    const cat = tx.category ?? "Uncategorized";
    const amount = tx.amount;

    if (tx.type === "CREDIT") {
      revenue[cat] = (revenue[cat] ?? 0) + amount;
    } else {
      // DEBIT
      if (COGS_CATEGORIES.has(cat)) {
        cogsBreakdown[cat] = (cogsBreakdown[cat] ?? 0) + amount;
      } else {
        expenses[cat] = (expenses[cat] ?? 0) + amount;
      }
    }
  }

  const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
  const totalCogs = Object.values(cogsBreakdown).reduce((s, v) => s + v, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
  const netIncome = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // Month-by-month breakdown
  const monthsData: MonthData[] = [];
  const targetMonths = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);

  for (const m of targetMonths) {
    const mStart = new Date(year, m - 1, 1);
    const mEnd = new Date(year, m, 0, 23, 59, 59, 999);

    const mTxs = transactions.filter(
      (tx) => new Date(tx.date) >= mStart && new Date(tx.date) <= mEnd
    );

    const mRevenue = mTxs
      .filter((t) => t.type === "CREDIT")
      .reduce((s, t) => s + t.amount, 0);
    const mCogs = mTxs
      .filter((t) => t.type === "DEBIT" && COGS_CATEGORIES.has(t.category ?? ""))
      .reduce((s, t) => s + t.amount, 0);
    const mExpenses = mTxs
      .filter(
        (t) =>
          t.type === "DEBIT" && !COGS_CATEGORIES.has(t.category ?? "")
      )
      .reduce((s, t) => s + t.amount, 0);
    const mGrossProfit = mRevenue - mCogs;
    const mNetIncome = mGrossProfit - mExpenses;

    monthsData.push({
      month: m,
      year,
      revenue: mRevenue,
      cogs: mCogs,
      grossProfit: mGrossProfit,
      expenses: mExpenses,
      netIncome: mNetIncome,
    });
  }

  return {
    revenue: { total: totalRevenue, byCategory: revenue },
    cogs: { total: totalCogs, byCategory: cogsBreakdown },
    grossProfit,
    grossMargin,
    expenses: { total: totalExpenses, byCategory: expenses },
    netIncome,
    netMargin,
    months: monthsData,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const { searchParams } = req.nextUrl;

  const currentYear = new Date().getFullYear();
  const yearParam = searchParams.get("year");
  const compareYearParam = searchParams.get("compareYear");
  const monthParam = searchParams.get("month");

  const year = yearParam ? parseInt(yearParam) : currentYear;
  const month = monthParam ? parseInt(monthParam) : undefined;
  const compareYear = compareYearParam ? parseInt(compareYearParam) : undefined;

  const [data, compareData] = await Promise.all([
    getPLData(userId, year, month),
    compareYear ? getPLData(userId, compareYear, month) : Promise.resolve(null),
  ]);

  return NextResponse.json({ data, compareData, year, compareYear, month });
}
