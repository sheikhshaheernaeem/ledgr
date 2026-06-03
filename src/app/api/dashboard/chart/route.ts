import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "APPROVED", date: { gte: sixMonthsAgo } },
    select: { date: true, amount: true, type: true },
  });

  const months: { month: number; year: number; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth(), year: d.getFullYear(), income: 0, expenses: 0 });
  }

  for (const tx of transactions) {
    const d = new Date(tx.date);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (!m) continue;
    if (tx.type === "CREDIT") m.income += tx.amount;
    else m.expenses += tx.amount;
  }

  return NextResponse.json(months);
}
