import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  let startDate = searchParams.get("startDate");
  let endDate = searchParams.get("endDate");

  // Default: current month
  if (!startDate || !endDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    startDate = startDate ?? `${y}-${m}-01`;
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    endDate = endDate ?? `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  }

  // Get all active accounts for user
  const accounts = await prisma.chartOfAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { code: "asc" },
  });

  // Get all journal lines in the period (excluding REVERSED entries)
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      account: { userId },
      journalEntry: {
        userId,
        status: { not: "REVERSED" },
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate + "T23:59:59"),
        },
      },
    },
    select: { accountId: true, debit: true, credit: true },
  });

  // Aggregate per account
  const aggregated = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const existing = aggregated.get(l.accountId) ?? { debit: 0, credit: 0 };
    aggregated.set(l.accountId, {
      debit: existing.debit + l.debit,
      credit: existing.credit + l.credit,
    });
  }

  // Build rows — only include accounts with activity
  const rows = accounts
    .filter((a) => aggregated.has(a.id))
    .map((a) => {
      const { debit, credit } = aggregated.get(a.id)!;
      const net = debit - credit;
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        normalBalance: a.normalBalance,
        debit,
        credit,
        net,
      };
    });

  // Group by type
  const grouped: Record<string, typeof rows> = {};
  for (const type of TYPE_ORDER) {
    const typeRows = rows.filter((r) => r.type === type);
    if (typeRows.length > 0) grouped[type] = typeRows;
  }

  // Grand totals
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return NextResponse.json({
    startDate,
    endDate,
    grouped,
    totalDebit,
    totalCredit,
    balanced,
  });
}
