import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returns = await prisma.vatReturn.findMany({
    where: { userId: session.user.id },
    orderBy: { periodStart: "desc" },
  });

  return NextResponse.json(returns);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { periodStart, periodEnd, notes } = body as {
    periodStart: string;
    periodEnd: string;
    notes?: string;
  };

  if (!periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "periodStart and periodEnd are required" },
      { status: 400 }
    );
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (start >= end) {
    return NextResponse.json(
      { error: "periodEnd must be after periodStart" },
      { status: 400 }
    );
  }

  // Auto-calculate from invoices in the period
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      issueDate: { gte: start, lte: end },
      status: { notIn: ["DRAFT", "VOID"] },
    },
  });

  // Auto-calculate from bills in the period
  const bills = await prisma.bill.findMany({
    where: {
      userId: session.user.id,
      issueDate: { gte: start, lte: end },
      status: { notIn: ["DRAFT", "VOID"] },
    },
  });

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const vatOnSales = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0);
  const totalPurchases = bills.reduce((sum, b) => sum + b.total, 0);
  const vatOnPurchases = bills.reduce((sum, b) => sum + b.taxAmount, 0);
  const vatPayable = vatOnSales - vatOnPurchases;

  const vatReturn = await prisma.vatReturn.create({
    data: {
      userId: session.user.id,
      periodStart: start,
      periodEnd: end,
      totalSales,
      vatOnSales,
      totalPurchases,
      vatOnPurchases,
      vatPayable,
      notes: notes ?? undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "VatReturn",
    entityId: vatReturn.id,
    after: vatReturn,
  });

  return NextResponse.json(vatReturn, { status: 201 });
}
