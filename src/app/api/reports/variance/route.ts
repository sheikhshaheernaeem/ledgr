import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || "0"); // 0 = all year

  // Get all budgets for the user
  const budgetFilter = month > 0
    ? { userId: session.user.id, year, month }
    : { userId: session.user.id, year };

  const budgets = await prisma.budget.findMany({ where: budgetFilter });

  // Get actual transactions for the period
  const startDate = month > 0 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const endDate = month > 0 ? new Date(year, month, 0) : new Date(year, 11, 31);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate, lte: endDate },
      status: { not: "PENDING" },
    },
  });

  // Group actuals by category
  const actualsByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    const cat = tx.category || "Uncategorized";
    actualsByCategory[cat] = (actualsByCategory[cat] || 0) + Math.abs(tx.amount);
  }

  // Build variance report
  const allCategories = new Set([
    ...budgets.map(b => b.category),
    ...Object.keys(actualsByCategory),
  ]);

  const rows = Array.from(allCategories).map(category => {
    const budgetAmount = budgets.filter(b => b.category === category).reduce((s, b) => s + b.amount, 0);
    const actual = actualsByCategory[category] || 0;
    const variance = budgetAmount - actual;
    const variancePct = budgetAmount > 0 ? (variance / budgetAmount) * 100 : null;
    const favorable = variance >= 0; // For expenses, under-budget is favorable

    return {
      category,
      budget: budgetAmount,
      actual,
      variance,
      variancePct,
      favorable,
    };
  }).sort((a, b) => a.category.localeCompare(b.category));

  const totals = {
    budget: rows.reduce((s, r) => s + r.budget, 0),
    actual: rows.reduce((s, r) => s + r.actual, 0),
    variance: rows.reduce((s, r) => s + r.variance, 0),
  };

  return NextResponse.json({ year, month, rows, totals });
}
