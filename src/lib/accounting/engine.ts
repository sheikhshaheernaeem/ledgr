/**
 * Accounting engine — the pure logic that turns persisted transactions into
 * summaries, P&L, and category breakdowns.
 *
 * Every consumer (dashboards, reports, AI prompts) should go through this
 * module so totals are computed identically everywhere.
 */

import { prisma } from "@/lib/db";
import type { NormalizedTransaction } from "@/lib/ai/transform";

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  byCategory: Record<string, { income: number; expense: number; count: number }>;
}

export interface PnLPeriod {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  byCategory: Record<string, { income: number; expense: number; count: number }>;
}

/**
 * Persist a single normalized transaction. Returns the created row's id.
 *
 * IMPORTANT: callers should batch these inside the pipeline rather than
 * calling sequentially in a loop (handled by the pipeline orchestrator).
 */
export async function addTransaction(t: NormalizedTransaction, sourceNote?: string): Promise<string> {
  const row = await prisma.transaction.create({
    data: {
      userId: t.userId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      confidence: t.confidence,
      status: "AI_CATEGORIZED",
      aiNotes: sourceNote ?? null,
    },
    select: { id: true },
  });
  return row.id;
}

/**
 * Persist many transactions in a single transaction (atomic).
 * Returns the created IDs.
 */
export async function addTransactionsBatch(
  txns: NormalizedTransaction[],
  sourceNote?: string,
): Promise<string[]> {
  if (txns.length === 0) return [];
  return prisma.$transaction(
    txns.map((t) =>
      prisma.transaction.create({
        data: {
          userId: t.userId,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          confidence: t.confidence,
          status: "AI_CATEGORIZED",
          aiNotes: sourceNote ?? null,
        },
        select: { id: true },
      }),
    ),
  ).then((rows) => rows.map((r) => r.id));
}

/**
 * Compute an overall summary across every transaction for a user (or a
 * scoped subset by date range or transactionIds).
 */
export async function calculateSummary(
  userId: string,
  opts: { from?: Date; to?: Date; transactionIds?: string[] } = {},
): Promise<Summary> {
  const where: {
    userId: string;
    date?: { gte?: Date; lte?: Date };
    id?: { in: string[] };
  } = { userId };
  if (opts.from || opts.to) {
    where.date = {};
    if (opts.from) where.date.gte = opts.from;
    if (opts.to) where.date.lte = opts.to;
  }
  if (opts.transactionIds?.length) where.id = { in: opts.transactionIds };

  const txns = await prisma.transaction.findMany({
    where,
    select: { type: true, amount: true, category: true },
  });

  return foldSummary(txns);
}

/**
 * Compute P&L for a specific month/year. If no month given, the entire
 * year is summed.
 */
export async function generatePnL(
  userId: string,
  month: number | undefined,
  year: number,
): Promise<PnLPeriod> {
  const from = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1);
  const to = month
    ? new Date(year, month, 0, 23, 59, 59, 999) // last day of that month
    : new Date(year, 11, 31, 23, 59, 59, 999);

  const summary = await calculateSummary(userId, { from, to });

  return {
    month: month ?? 0,
    year,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    netProfit: summary.netProfit,
    transactionCount: summary.transactionCount,
    byCategory: summary.byCategory,
  };
}

/**
 * Compute monthly P&L for an entire year. Used by reports + dashboards.
 */
export async function generateYearlyPnL(userId: string, year: number): Promise<PnLPeriod[]> {
  const results: PnLPeriod[] = [];
  for (let m = 1; m <= 12; m++) {
    results.push(await generatePnL(userId, m, year));
  }
  return results;
}

interface RawTxn { type: string; amount: number; category: string | null }

function foldSummary(txns: RawTxn[]): Summary {
  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Summary["byCategory"] = {};

  for (const t of txns) {
    const isIncome = t.type === "INCOME" || t.amount > 0;
    const cat = t.category ?? "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0, count: 0 };

    if (isIncome) {
      totalIncome += Math.abs(t.amount);
      byCategory[cat].income += Math.abs(t.amount);
    } else {
      totalExpenses += Math.abs(t.amount);
      byCategory[cat].expense += Math.abs(t.amount);
    }
    byCategory[cat].count++;
  }

  return {
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    netProfit: round2(totalIncome - totalExpenses),
    transactionCount: txns.length,
    byCategory,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
