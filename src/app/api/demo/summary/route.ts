/**
 * GET /api/demo/summary
 *
 * Live dashboard payload polled by the LiveSummary widget. Returns a
 * single response with everything the UI needs to render the demo card:
 *
 *   {
 *     total_documents,
 *     processed_documents,
 *     processing_documents,
 *     failed_documents,
 *     total_income,
 *     total_expense,
 *     net_profit,
 *     transaction_count,
 *     last_processed_at,
 *     last_processed_count
 *   }
 *
 * Everything computed from the DB. No mocks. Used to demonstrate
 * "upload N documents → see full financial summary instantly".
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

  const [
    totalDocs,
    processed,
    processing,
    failed,
    summary,
    lastProcessedDoc,
  ] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: "PROCESSED" } }),
    prisma.document.count({ where: { userId, status: { in: ["UPLOADED", "PROCESSING"] } } }),
    prisma.document.count({ where: { userId, status: { in: ["FAILED", "ERROR"] } } }),
    calculateSummary(userId),
    prisma.document.findFirst({
      where: { userId, status: "PROCESSED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true },
    }),
  ]);

  // Transactions linked to the most-recently processed doc (via AiAnalysis).
  let lastProcessedCount = 0;
  if (lastProcessedDoc) {
    lastProcessedCount = await prisma.aiAnalysis.count({
      where: { userId, documentId: lastProcessedDoc.id },
    });
  }

  return NextResponse.json({
    total_documents: totalDocs,
    processed_documents: processed,
    processing_documents: processing,
    failed_documents: failed,
    total_income: summary.totalIncome,
    total_expense: summary.totalExpenses,
    net_profit: summary.netProfit,
    transaction_count: summary.transactionCount,
    last_processed_at: lastProcessedDoc?.updatedAt ?? null,
    last_processed_name: lastProcessedDoc?.name ?? null,
    last_processed_count: lastProcessedCount,
    by_category: summary.byCategory,
  });
}
