import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, transactions, invoices, clients, bankAccounts, reports] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        revenueGoal: true,
        createdAt: true,
        updatedAt: true,
        // deliberately exclude password hash
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
    prisma.invoice.findMany({
      where: { userId },
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bankAccount.findMany({
      where: { userId },
    }),
    prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user,
    transactions,
    invoices,
    clients,
    bankAccounts,
    reports,
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ledgr-export.json"',
    },
  });
}
