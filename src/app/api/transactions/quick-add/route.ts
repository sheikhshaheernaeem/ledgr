import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, description, amount, type, category, notes } = body as {
    date: string;
    description: string;
    amount: number;
    type: string;
    category?: string | null;
    notes?: string | null;
  };

  if (!date || !description || amount == null || !type) {
    return NextResponse.json(
      { error: "date, description, amount, and type are required" },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      description,
      amount: Number(amount),
      type,
      category: category ?? null,
      notes: notes ?? null,
      status: "APPROVED",
      confidence: null,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Transaction",
    entityId: transaction.id,
    after: transaction,
    transactionId: transaction.id,
  });

  return NextResponse.json(transaction, { status: 201 });
}
