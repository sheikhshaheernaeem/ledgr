import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN" || role === "ACCOUNTANT";
  const { clientId } = await params;

  // Admins/accountants can view any client; others need a managed relationship
  let clientInfo: { id: string; name: string | null; email: string; companyName: string | null; createdAt: Date } | null = null;

  if (isAdmin) {
    clientInfo = await prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, email: true, companyName: true, createdAt: true },
    });
  } else {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: userId, clientId } },
      include: { client: { select: { id: true, name: true, email: true, companyName: true, createdAt: true } } },
    });
    if (mc?.isActive) clientInfo = mc.client;
  }

  if (!clientInfo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [transactions, allTransactions, invoices, reports, statements, anomalies, messages] = await Promise.all([
    // This-month summary
    prisma.transaction.findMany({
      where: { userId: clientId, date: { gte: thisMonthStart } },
      select: { amount: true, type: true, category: true, date: true },
    }),
    // Recent transactions for review
    prisma.transaction.findMany({
      where: { userId: clientId },
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true, date: true, description: true, amount: true, type: true,
        category: true, subcategory: true, status: true, confidence: true,
        notes: true, reconciled: true,
      },
    }),
    prisma.invoice.findMany({
      where: { userId: clientId, status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
      select: { id: true, status: true, total: true, dueDate: true, clientName: true },
    }),
    prisma.report.findMany({
      where: { userId: clientId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
      select: {
        id: true, month: true, year: true,
        totalIncome: true, totalExpenses: true, netProfit: true,
        status: true, aiSummary: true,
        draftedAt: true,
        accountantApprovedAt: true,
        accountantApprovedById: true,
        clientApprovedAt: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.statement.findMany({
      where: { userId: clientId },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, rowCount: true, status: true, periodStart: true, periodEnd: true, createdAt: true, errorMsg: true },
    }),
    prisma.anomalyFlag.findMany({
      where: { userId: clientId, dismissed: false },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true, transactionId: true, entityType: true, entityId: true,
        reason: true, severity: true, riskScore: true, createdAt: true,
      },
    }),
    prisma.message.findMany({
      where: { userId: clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, body: true, role: true, readAt: true, createdAt: true, reportId: true, transactionId: true },
    }),
  ]);

  const revenue = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  allTransactions
    .filter((t) => t.type === "DEBIT")
    .forEach((t) => { const cat = t.category ?? "Other"; categoryMap[cat] = (categoryMap[cat] ?? 0) + t.amount; });
  const categoryBreakdown = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const openInvoices = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");

  // Reports awaiting accountant approval
  const pendingApproval = reports.filter((r) => r.status === "DRAFT" || (r.draftedAt && !r.accountantApprovedAt));
  const uncategorized = allTransactions.filter((t) => !t.category || t.category === "Uncategorized").length;

  return NextResponse.json({
    client: clientInfo,
    summary: {
      thisMonth: {
        revenue,
        expenses,
        netProfit: revenue - expenses,
        transactionCount: transactions.length,
      },
      invoices: {
        open: openInvoices.length,
        overdue: overdueInvoices.length,
        openAmount: openInvoices.reduce((s, i) => s + i.total, 0),
        recentOpen: openInvoices.slice(0, 5),
      },
      lastReport: reports[0] ?? null,
      pendingApprovalCount: pendingApproval.length,
      anomalyCount: anomalies.length,
      uncategorizedCount: uncategorized,
      unreadMessages: messages.filter((m) => !m.readAt && m.role === "CLIENT").length,
    },
    statements,
    transactions: allTransactions,
    categoryBreakdown,
    reports,
    anomalies,
    messages,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountantId = session.user.id as string;
  const { clientId } = await params;

  const mc = await prisma.managedClient.findUnique({
    where: { accountantId_clientId: { accountantId, clientId } },
  });

  if (!mc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.managedClient.update({
    where: { id: mc.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
