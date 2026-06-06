import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const bankAccountId = searchParams.get("bankAccountId");
  const unreconciled = searchParams.get("unreconciled") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "50")));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (search) where.description = { contains: search, mode: "insensitive" };
  if (category) where.category = category;
  if (status) where.status = status;
  if (bankAccountId) where.bankAccountId = bankAccountId;
  if (unreconciled) where.reconciled = false;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate + "T23:59:59");
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { date, description, amount, type, category, subcategory, notes, bankAccountId } = body as {
    date: string;
    description: string;
    amount: number;
    type: string;
    category?: string | null;
    subcategory?: string | null;
    notes?: string | null;
    bankAccountId?: string | null;
  };

  if (!date || !description || amount == null || !type) {
    return NextResponse.json(
      { error: "date, description, amount, and type are required" },
      { status: 400 }
    );
  }

  // Period lock check
  const txDate = new Date(date);
  const txYear = txDate.getFullYear();
  const txMonth = txDate.getMonth() + 1;
  const lock = await prisma.lockedPeriod.findFirst({
    where: { userId, year: txYear, month: txMonth },
  });
  if (lock) {
    return NextResponse.json(
      { error: "This period is locked. Unlock it first to add transactions." },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      date: txDate,
      description,
      amount: Number(amount),
      type,
      category: category ?? null,
      subcategory: subcategory ?? null,
      notes: notes ?? null,
      bankAccountId: bankAccountId ?? null,
      status: "APPROVED",
      confidence: null,
    },
  });

  await writeAudit({
    userId,
    action: "CREATE",
    entityType: "Transaction",
    entityId: transaction.id,
    after: transaction,
    transactionId: transaction.id,
  });

  return NextResponse.json(transaction, { status: 201 });
}
