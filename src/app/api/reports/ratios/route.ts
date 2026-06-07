import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, month, 0);

  // Get journal lines for the period
  const journalLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        userId: session.user.id,
        status: "POSTED",
        date: { lte: endDate },
      },
    },
    include: { account: true, journalEntry: true },
  });

  // Aggregate by account type
  const balances: Record<string, number> = {
    ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0,
  };
  const currentAssets: number[] = [];
  const currentLiabilities: number[] = [];
  let cash = 0;
  let inventory = 0;
  let receivables = 0;
  let payables = 0;
  let interestExpense = 0;
  let ebit = 0;

  for (const line of journalLines) {
    const type = line.account.type;
    const subtype = line.account.subtype?.toLowerCase() || "";
    const net = line.debit - line.credit;

    if (type === "ASSET") {
      balances.ASSET += net;
      if (subtype.includes("current") || subtype.includes("cash") || subtype.includes("receiv")) {
        currentAssets.push(net);
      }
      if (subtype.includes("cash")) cash += net;
      if (subtype.includes("inventor")) inventory += net;
      if (subtype.includes("receiv")) receivables += net;
    } else if (type === "LIABILITY") {
      balances.LIABILITY += line.credit - line.debit;
      if (subtype.includes("current") || subtype.includes("payab")) {
        currentLiabilities.push(line.credit - line.debit);
      }
      if (subtype.includes("payab")) payables += line.credit - line.debit;
      if (subtype.includes("interest")) interestExpense += line.credit - line.debit;
    } else if (type === "EQUITY") {
      balances.EQUITY += line.credit - line.debit;
    } else if (type === "REVENUE") {
      if (line.journalEntry.date >= startDate) balances.REVENUE += line.credit - line.debit;
    } else if (type === "EXPENSE") {
      if (line.journalEntry.date >= startDate) {
        balances.EXPENSE += line.debit - line.credit;
        if (!subtype.includes("interest")) ebit += line.debit - line.credit;
      }
    }
  }

  const totalCurrentAssets = currentAssets.reduce((s, v) => s + v, 0);
  const totalCurrentLiabilities = currentLiabilities.reduce((s, v) => s + v, 0);
  const netIncome = balances.REVENUE - balances.EXPENSE;
  const revenue = balances.REVENUE;
  const grossProfit = revenue - (balances.EXPENSE * 0.6); // approx COGS as 60% of expenses

  const ratios = {
    // Liquidity
    currentRatio: totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : null,
    quickRatio: totalCurrentLiabilities > 0 ? (totalCurrentAssets - inventory) / totalCurrentLiabilities : null,
    cashRatio: totalCurrentLiabilities > 0 ? cash / totalCurrentLiabilities : null,
    // Profitability
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : null,
    netMargin: revenue > 0 ? (netIncome / revenue) * 100 : null,
    returnOnAssets: balances.ASSET > 0 ? (netIncome / balances.ASSET) * 100 : null,
    returnOnEquity: balances.EQUITY > 0 ? (netIncome / balances.EQUITY) * 100 : null,
    // Solvency
    debtToEquity: balances.EQUITY > 0 ? balances.LIABILITY / balances.EQUITY : null,
    debtRatio: balances.ASSET > 0 ? balances.LIABILITY / balances.ASSET : null,
    interestCoverage: interestExpense > 0 ? ebit / interestExpense : null,
    // Efficiency
    assetTurnover: balances.ASSET > 0 ? revenue / balances.ASSET : null,
    inventoryTurnover: inventory > 0 ? (balances.EXPENSE * 0.6) / inventory : null,
    receivablesDays: revenue > 0 ? (receivables / revenue) * 365 : null,
    payablesDays: balances.EXPENSE > 0 ? (payables / balances.EXPENSE) * 365 : null,
  };

  // Get historical snapshots
  const snapshots = await prisma.financialSnapshot.findMany({
    where: { userId: session.user.id },
    orderBy: { period: "desc" },
    take: 12,
  });

  return NextResponse.json({ period: { year, month }, ratios, balances, snapshots });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { period, ...ratioData } = body;

  const snapshot = await prisma.financialSnapshot.upsert({
    where: { userId_period: { userId: session.user.id, period: new Date(period) } },
    create: {
      userId: session.user.id,
      period: new Date(period),
      ...ratioData,
    },
    update: ratioData,
  });

  return NextResponse.json(snapshot);
}
