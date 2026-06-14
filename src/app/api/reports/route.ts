/**
 * GET /api/reports
 *
 * Default: list of historical Report rows (back-compat).
 *
 * With ?kind=… switches into spec'd accounting summary mode:
 *   - kind=summary               → all-time summary
 *   - kind=pnl&month=X&year=Y    → specific month P&L
 *   - kind=yearly&year=Y         → 12-month breakdown for one year
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateSummary,
  generatePnL,
  generateYearlyPnL,
} from "@/lib/accounting/engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");

  // ── Back-compat default: list historical reports ──
  if (!kind) {
    const reports = await prisma.report.findMany({
      where: { userId },
      select: { id: true, month: true, year: true, status: true, netProfit: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(reports);
  }

  // ── Accounting engine modes ──
  const month = searchParams.get("month") ? parseInt(searchParams.get("month") as string, 10) : undefined;
  // eslint-disable-next-line react-hooks/purity
  const year = searchParams.get("year") ? parseInt(searchParams.get("year") as string, 10) : new Date().getFullYear();

  if (kind === "summary") {
    const summary = await calculateSummary(userId);
    return NextResponse.json({ kind: "summary", summary });
  }

  if (kind === "pnl") {
    if (!month || month < 1 || month > 12) {
      return NextResponse.json({ error: "month (1-12) required for kind=pnl" }, { status: 400 });
    }
    const pnl = await generatePnL(userId, month, year);
    return NextResponse.json({ kind, pnl });
  }

  if (kind === "yearly") {
    const months = await generateYearlyPnL(userId, year);
    const total = months.reduce(
      (acc, m) => ({
        totalIncome: acc.totalIncome + m.totalIncome,
        totalExpenses: acc.totalExpenses + m.totalExpenses,
        netProfit: acc.netProfit + m.netProfit,
        transactionCount: acc.transactionCount + m.transactionCount,
      }),
      { totalIncome: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 },
    );
    return NextResponse.json({ kind, year, months, total });
  }

  return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
}
