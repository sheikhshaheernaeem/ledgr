/**
 * GET /api/demo/fullSummary
 *
 * Spec-named alias of /api/demo/summary. Returns the exact field-names the
 * latest spec calls for so the YC demo card binds against the documented
 * payload without any UI tweaks.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateSummary } from "@/lib/accounting/engine";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [totalDocs, processed, summary] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: "PROCESSED" } }),
    calculateSummary(userId),
  ]);

  return NextResponse.json({
    total_documents: totalDocs,
    processed_documents: processed,
    total_income: summary.totalIncome,
    total_expense: summary.totalExpenses,
    net_profit: summary.netProfit,
  });
}
