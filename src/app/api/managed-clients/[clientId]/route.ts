import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountantId = session.user.id as string;
  const { clientId } = await params;

  // Verify the managed client relationship
  const mc = await prisma.managedClient.findUnique({
    where: { accountantId_clientId: { accountantId, clientId } },
    include: { client: { select: { id: true, name: true, email: true, companyName: true } } },
  });

  if (!mc || !mc.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [transactions, invoices, reports] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: clientId, date: { gte: thisMonthStart } },
      select: { amount: true, type: true, category: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { userId: clientId, status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
      select: { id: true, status: true, total: true, dueDate: true, clientName: true },
    }),
    prisma.report.findMany({
      where: { userId: clientId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 1,
      select: { month: true, year: true, totalIncome: true, totalExpenses: true, netProfit: true, status: true },
    }),
  ]);

  const revenue = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const netProfit = revenue - expenses;

  const openInvoices = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");

  return NextResponse.json({
    client: mc.client,
    summary: {
      thisMonth: {
        revenue,
        expenses,
        netProfit,
        transactionCount: transactions.length,
      },
      invoices: {
        open: openInvoices.length,
        overdue: overdueInvoices.length,
        openAmount: openInvoices.reduce((s, i) => s + i.total, 0),
        recentOpen: openInvoices.slice(0, 5),
      },
      lastReport: reports[0] ?? null,
    },
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

  // Soft delete — mark inactive rather than truly deleting
  await prisma.managedClient.update({
    where: { id: mc.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
