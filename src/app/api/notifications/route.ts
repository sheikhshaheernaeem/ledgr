import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [overdueInvoices, pendingCount, recentSentInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId, status: "OVERDUE" },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.transaction.count({
      where: { userId, status: "PENDING" },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: "SENT",
        updatedAt: { gte: sevenDaysAgo },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const notifications: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    date?: Date | null;
    href: string;
  }> = [];

  // Overdue invoices
  for (const inv of overdueInvoices) {
    notifications.push({
      id: `overdue_${inv.id}`,
      type: "overdue_invoice",
      title: "Invoice overdue",
      description: `${inv.invoiceNumber} from ${inv.clientName} is overdue`,
      date: inv.dueDate,
      href: `/invoices/${inv.id}`,
    });
  }

  // Pending transactions
  if (pendingCount > 0) {
    notifications.push({
      id: "pending_transactions",
      type: "pending_transactions",
      title: "Transactions need review",
      description: `${pendingCount} transaction${pendingCount === 1 ? "" : "s"} waiting for approval`,
      date: null,
      href: "/transactions",
    });
  }

  // Recently sent invoices
  for (const inv of recentSentInvoices) {
    notifications.push({
      id: `sent_${inv.id}`,
      type: "invoice_sent",
      title: "Invoice sent",
      description: `${inv.invoiceNumber} sent to ${inv.clientName}`,
      date: inv.updatedAt,
      href: `/invoices/${inv.id}`,
    });
  }

  return NextResponse.json({
    notifications,
    unreadCount: notifications.length,
  });
}
