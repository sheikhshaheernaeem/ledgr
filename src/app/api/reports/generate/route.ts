import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePLSummary, type CategorizedTransaction } from "@/lib/gemini";
import { z } from "zod";

const schema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month/year" }, { status: 400 });
  }

  const { month, year } = parsed.data;
  const userId = session.user.id as string;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      status: { not: "PENDING" },
    },
  });

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "No approved transactions found for this period" },
      { status: 404 }
    );
  }

  const forAI: CategorizedTransaction[] = transactions.map((t) => ({
    date: t.date.toISOString().split("T")[0],
    description: t.description,
    amount: t.amount,
    type: t.type as "DEBIT" | "CREDIT",
    category: t.category ?? "Other",
    subcategory: t.subcategory ?? "",
    confidence: t.confidence ?? 1,
  }));

  const summary = await generatePLSummary(forAI, month, year);

  const report = await prisma.report.upsert({
    where: {
      id:
        (
          await prisma.report.findFirst({
            where: { userId, month, year },
            select: { id: true },
          })
        )?.id ?? "new",
    },
    update: {
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      aiSummary: summary.narrative,
      status: "DRAFT",
    },
    create: {
      userId,
      month,
      year,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      aiSummary: summary.narrative,
    },
  });

  await prisma.transaction.updateMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    data: { reportId: report.id },
  });

  return NextResponse.json({ reportId: report.id, summary });
}
