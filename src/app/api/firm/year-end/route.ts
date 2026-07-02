import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const userId = session.user.id as string;
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: userId, clientId: targetUserId } },
    });
    if (!mc?.isActive) return { error: NextResponse.json({ error: "Not your client" }, { status: 403 }) };
  }
  return { userId };
}

// GET /api/firm/year-end?clientId=...&year=YYYY
// Returns checklist with current state derived from existing data.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? `${new Date().getFullYear() - 1}`);
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const g = await operatorGate(clientId);
  if ("error" in g) return g.error;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [allTxns, uncategorized, reconciliations, lockedPeriods, anomalies, depreciations, reports, fixedAssets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: clientId, date: { gte: yearStart, lte: yearEnd } },
      select: { id: true, category: true, type: true, amount: true, reconciled: true },
    }),
    prisma.transaction.count({
      where: { userId: clientId, date: { gte: yearStart, lte: yearEnd }, OR: [{ category: null }, { category: "Uncategorized" }] },
    }),
    prisma.reconciliation.findMany({
      where: { userId: clientId, statementDate: { gte: yearStart, lte: yearEnd } },
      select: { status: true, statementDate: true },
    }),
    prisma.lockedPeriod.findMany({
      where: { userId: clientId, year },
      select: { month: true, year: true },
    }),
    prisma.anomalyFlag.count({
      where: { userId: clientId, dismissed: false },
    }),
    prisma.depreciationEntry.count({
      where: { userId: clientId, year },
    }),
    prisma.report.findMany({
      where: { userId: clientId, year },
      select: { month: true, status: true, clientApprovedAt: true },
    }),
    prisma.fixedAsset.count({
      where: { userId: clientId },
    }),
  ]);

  const totalTxns = allTxns.length;
  const reconciledTxns = allTxns.filter((t) => t.reconciled).length;
  const monthlyReportsApproved = reports.filter((r) => r.clientApprovedAt).length;
  const allMonthsLocked = lockedPeriods.length === 12;
  const reconciledAll = totalTxns > 0 && reconciledTxns === totalTxns;
  const allReconciliationsDone = reconciliations.length > 0 && reconciliations.every((r) => r.status === "COMPLETED");

  const checklist = [
    { id: "txns_categorized", label: "All transactions categorized", done: uncategorized === 0 && totalTxns > 0, detail: `${uncategorized} uncategorized of ${totalTxns}` },
    { id: "txns_reconciled", label: "All transactions reconciled", done: reconciledAll, detail: `${reconciledTxns} / ${totalTxns} matched` },
    { id: "monthly_reconciliations", label: "Monthly reconciliations completed", done: allReconciliationsDone, detail: `${reconciliations.filter((r) => r.status === "COMPLETED").length} / ${reconciliations.length} months` },
    { id: "anomalies_resolved", label: "All anomalies reviewed", done: anomalies === 0, detail: `${anomalies} open flag${anomalies !== 1 ? "s" : ""}` },
    { id: "monthly_reports_delivered", label: "12 monthly reports delivered", done: monthlyReportsApproved === 12, detail: `${monthlyReportsApproved} / 12 client-approved` },
    { id: "depreciation_posted", label: "Depreciation posted for the year", done: fixedAssets === 0 || depreciations > 0, detail: fixedAssets === 0 ? "no fixed assets" : `${depreciations} entries posted` },
    { id: "periods_locked", label: "All 12 months locked", done: allMonthsLocked, detail: `${lockedPeriods.length} / 12 locked` },
  ];

  const completedCount = checklist.filter((c) => c.done).length;

  return NextResponse.json({
    year,
    checklist,
    progress: { completed: completedCount, total: checklist.length },
  });
}
