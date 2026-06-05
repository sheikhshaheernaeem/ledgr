import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  // Verify account belongs to user
  const account = await prisma.chartOfAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Opening balance: sum all lines BEFORE startDate
  let openingBalance = 0;
  if (startDate) {
    const prior = await prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          userId,
          date: { lt: new Date(startDate) },
          status: { not: "REVERSED" },
        },
      },
      select: { debit: true, credit: true },
    });
    openingBalance = prior.reduce((sum, l) => {
      if (account.normalBalance === "DEBIT") {
        return sum + l.debit - l.credit;
      } else {
        return sum + l.credit - l.debit;
      }
    }, 0);
  }

  // Lines in period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineWhere: any = {
    accountId,
    journalEntry: {
      userId,
      status: { not: "REVERSED" },
    },
  };
  if (startDate || endDate) {
    lineWhere.journalEntry.date = {};
    if (startDate) lineWhere.journalEntry.date.gte = new Date(startDate);
    if (endDate) lineWhere.journalEntry.date.lte = new Date(endDate + "T23:59:59");
  }

  const lines = await prisma.journalEntryLine.findMany({
    where: lineWhere,
    include: {
      journalEntry: {
        select: { entryNumber: true, date: true, description: true, status: true },
      },
    },
    orderBy: { journalEntry: { date: "asc" } },
  });

  // Build running balance
  let runningBalance = openingBalance;
  const rows = lines.map((l) => {
    if (account.normalBalance === "DEBIT") {
      runningBalance += l.debit - l.credit;
    } else {
      runningBalance += l.credit - l.debit;
    }
    return {
      id: l.id,
      date: l.journalEntry.date,
      description: l.description ?? l.journalEntry.description,
      entryNumber: l.journalEntry.entryNumber,
      debit: l.debit,
      credit: l.credit,
      balance: runningBalance,
    };
  });

  const closingBalance = runningBalance;

  return NextResponse.json({
    account,
    openingBalance,
    closingBalance,
    rows,
  });
}
