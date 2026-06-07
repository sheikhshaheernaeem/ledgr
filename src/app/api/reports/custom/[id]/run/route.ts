import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const report = await prisma.customReport.findFirst({ where: { id, userId: session.user.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse config
  let config: { dataSource?: string; filters?: { category?: string; dateFrom?: string; dateTo?: string }; groupBy?: string; limit?: number } = {};
  try {
    config = JSON.parse(report.configJson);
  } catch { config = {}; }

  const dataSource = config.dataSource || "transactions";
  const filters = config.filters || {};
  const limit = config.limit || 100;

  let data: unknown[] = [];

  if (dataSource === "transactions") {
    const where: Record<string, unknown> = { userId: session.user.id };
    if (filters.category) where.category = filters.category;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) (where.date as Record<string, unknown>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.date as Record<string, unknown>).lte = new Date(filters.dateTo);
    }
    data = await prisma.transaction.findMany({
      where,
      take: limit,
      orderBy: { date: "desc" },
    });
  } else if (dataSource === "invoices") {
    data = await prisma.invoice.findMany({
      where: { userId: session.user.id },
      include: { lineItems: true },
      take: limit,
      orderBy: { issueDate: "desc" },
    });
  } else if (dataSource === "bills") {
    data = await prisma.bill.findMany({
      where: { userId: session.user.id },
      take: limit,
      orderBy: { issueDate: "desc" },
    });
  } else if (dataSource === "journal_entries") {
    data = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      include: { lines: { include: { account: true } } },
      take: limit,
      orderBy: { date: "desc" },
    });
  }

  // Update last run time
  await prisma.customReport.update({
    where: { id },
    data: { lastRunAt: new Date() },
  });

  return NextResponse.json({ report: { id, name: report.name, reportType: report.reportType }, data, count: data.length, runAt: new Date() });
}
