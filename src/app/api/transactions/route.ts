import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
