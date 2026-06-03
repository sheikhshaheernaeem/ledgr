import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const bankAccountId = searchParams.get("bankAccountId");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (bankAccountId) where.bankAccountId = bankAccountId;

  const reconciliations = await prisma.reconciliation.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reconciliations);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { bankAccountId, statementDate, statementBalance, items } = body as {
    bankAccountId: string;
    statementDate: string;
    statementBalance: number;
    items: Array<{
      statementDate: string;
      statementDesc: string;
      statementAmount: number;
    }>;
  };

  if (!bankAccountId || !statementDate || statementBalance == null) {
    return NextResponse.json(
      { error: "bankAccountId, statementDate, and statementBalance are required" },
      { status: 400 }
    );
  }

  // Verify the bank account belongs to this user
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId: session.user.id },
  });

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  // Create reconciliation with items
  const reconciliation = await prisma.reconciliation.create({
    data: {
      bankAccountId,
      userId: session.user.id,
      statementDate: new Date(statementDate),
      statementBalance,
      items: {
        create: (items ?? []).map((item) => ({
          statementDate: new Date(item.statementDate),
          statementDesc: item.statementDesc,
          statementAmount: item.statementAmount,
        })),
      },
    },
    include: { items: true },
  });

  // Auto-match items to transactions
  let autoMatched = 0;
  const unmatched: string[] = [];

  for (const item of reconciliation.items) {
    const itemDate = new Date(item.statementDate);
    const dateMin = new Date(itemDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    const dateMax = new Date(itemDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const matchedTx = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        reconciled: false,
        date: { gte: dateMin, lte: dateMax },
        amount: {
          gte: item.statementAmount - 0.01,
          lte: item.statementAmount + 0.01,
        },
      },
    });

    if (matchedTx) {
      await prisma.reconciliationItem.update({
        where: { id: item.id },
        data: {
          matched: true,
          matchedAt: new Date(),
          transactionId: matchedTx.id,
        },
      });

      await prisma.transaction.update({
        where: { id: matchedTx.id },
        data: { reconciled: true, reconciledAt: new Date() },
      });

      autoMatched++;
    } else {
      unmatched.push(item.id);
    }
  }

  return NextResponse.json(
    { id: reconciliation.id, autoMatched, unmatched },
    { status: 201 }
  );
}
