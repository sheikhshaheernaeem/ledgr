import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { fromAccountId, toAccountId, amount, date, description, reference } = await req.json();

  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return NextResponse.json({ error: "fromAccountId, toAccountId and amount are required" }, { status: 400 });
  }
  if (fromAccountId === toAccountId) {
    return NextResponse.json({ error: "Cannot transfer to same account" }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    prisma.bankAccount.findFirst({ where: { id: fromAccountId, userId } }),
    prisma.bankAccount.findFirst({ where: { id: toAccountId, userId } }),
  ]);

  if (!from || !to) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (from.currentBalance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  const txDate = date ? new Date(date) : new Date();
  const desc = description || `Transfer from ${from.name} to ${to.name}`;

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: fromAccountId }, data: { currentBalance: { decrement: amount } } }),
    prisma.bankAccount.update({ where: { id: toAccountId }, data: { currentBalance: { increment: amount } } }),
    prisma.fundTransfer.create({
      data: { userId, fromAccountId, toAccountId, amount, date: txDate, description: desc, reference: reference || null },
    }),
    prisma.transaction.create({
      data: { userId, date: txDate, description: `Transfer out: ${desc}`, amount, type: "DEBIT", category: "Fund Transfer", status: "APPROVED", bankAccountId: fromAccountId, voucherType: "FUND_TRANSFER", notes: reference || null },
    }),
    prisma.transaction.create({
      data: { userId, date: txDate, description: `Transfer in: ${desc}`, amount, type: "CREDIT", category: "Fund Transfer", status: "APPROVED", bankAccountId: toAccountId, voucherType: "FUND_TRANSFER", notes: reference || null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const transfers = await prisma.fundTransfer.findMany({
    where: { userId },
    include: {
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(transfers);
}
