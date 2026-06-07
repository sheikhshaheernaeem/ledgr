import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get("type") || "PL"; // PL | BS
  const periodStart = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), 0, 1);
  const periodEnd = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  // Get all entities for this user
  const entities = await prisma.entity.findMany({
    where: { userId: session.user.id, isActive: true },
  });

  // Get inter-company transactions for elimination
  const icTxns = await prisma.interCompanyTransaction.findMany({
    where: { userId: session.user.id, eliminated: false },
  });

  // Get journal entries grouped by entity
  const journalLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        userId: session.user.id,
        date: { gte: periodStart, lte: periodEnd },
      },
    },
    include: {
      journalEntry: true,
      account: true,
    },
  });

  // Build entity breakdown
  const entityBreakdown: Record<string, { revenue: number; expenses: number; assets: number; liabilities: number; equity: number }> = {};

  for (const entity of entities) {
    entityBreakdown[entity.id] = { revenue: 0, expenses: 0, assets: 0, liabilities: 0, equity: 0 };
  }

  // Aggregate by account type
  const totals = { revenue: 0, expenses: 0, assets: 0, liabilities: 0, equity: 0 };

  for (const line of journalLines) {
    const accountType = line.account.type;
    const net = line.debit - line.credit;
    const entityId = line.journalEntry.entityId;

    if (accountType === "REVENUE") {
      totals.revenue += line.credit - line.debit;
      if (entityId && entityBreakdown[entityId]) entityBreakdown[entityId].revenue += line.credit - line.debit;
    } else if (accountType === "EXPENSE") {
      totals.expenses += line.debit - line.credit;
      if (entityId && entityBreakdown[entityId]) entityBreakdown[entityId].expenses += line.debit - line.credit;
    } else if (accountType === "ASSET") {
      totals.assets += net;
      if (entityId && entityBreakdown[entityId]) entityBreakdown[entityId].assets += net;
    } else if (accountType === "LIABILITY") {
      totals.liabilities += line.credit - line.debit;
      if (entityId && entityBreakdown[entityId]) entityBreakdown[entityId].liabilities += line.credit - line.debit;
    } else if (accountType === "EQUITY") {
      totals.equity += line.credit - line.debit;
      if (entityId && entityBreakdown[entityId]) entityBreakdown[entityId].equity += line.credit - line.debit;
    }
  }

  // Compute elimination amount
  const eliminationTotal = icTxns.reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totals.revenue - totals.expenses;

  return NextResponse.json({
    reportType,
    periodStart,
    periodEnd,
    consolidated: {
      revenue: totals.revenue,
      expenses: totals.expenses,
      netIncome,
      assets: totals.assets,
      liabilities: totals.liabilities,
      equity: totals.equity + netIncome,
    },
    eliminationTotal,
    interCompanyTransactions: icTxns,
    entityBreakdown: entities.map(e => ({
      entity: e,
      ...entityBreakdown[e.id],
      netIncome: (entityBreakdown[e.id]?.revenue ?? 0) - (entityBreakdown[e.id]?.expenses ?? 0),
    })),
  });
}
