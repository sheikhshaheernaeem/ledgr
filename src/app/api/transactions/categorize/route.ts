import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorizeTransactions, type RawTransaction } from "@/lib/gemini";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.transaction.findMany({
    where: { userId: session.user.id as string, status: "PENDING" },
    orderBy: { date: "asc" },
    take: 100,
  });

  if (pending.length === 0) {
    return NextResponse.json({ count: 0, message: "No pending transactions" });
  }

  const raw: RawTransaction[] = pending.map((t) => ({
    date: t.date.toISOString().split("T")[0],
    description: t.description,
    amount: t.amount,
    type: t.type as "DEBIT" | "CREDIT",
  }));

  const categorized = await categorizeTransactions(raw);

  await Promise.all(
    categorized.map((c, i) =>
      prisma.transaction.update({
        where: { id: pending[i].id },
        data: {
          category: c.category,
          subcategory: c.subcategory,
          confidence: c.confidence,
          aiNotes: c.aiNotes || null,
          status: "APPROVED",
        },
      })
    )
  );

  return NextResponse.json({ count: categorized.length });
}
