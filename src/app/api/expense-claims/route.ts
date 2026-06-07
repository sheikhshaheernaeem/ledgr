import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = await prisma.expenseClaim.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(claims);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { description, notes, status, items } = body as {
    description: string;
    notes?: string;
    status?: string;
    items: Array<{
      date: string;
      description: string;
      category?: string;
      amount: number;
      receiptData?: string;
    }>;
  };

  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
  }

  // Auto-generate claim number
  const count = await prisma.expenseClaim.count({ where: { userId: session.user.id } });
  const claimNumber = `EXP-${String(count + 1).padStart(4, "0")}`;

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const claimStatus = status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";

  const claim = await prisma.expenseClaim.create({
    data: {
      userId: session.user.id,
      claimNumber,
      description,
      notes: notes ?? undefined,
      status: claimStatus,
      totalAmount,
      submittedAt: claimStatus === "SUBMITTED" ? new Date() : undefined,
      items: {
        create: items.map((item) => ({
          date: new Date(item.date),
          description: item.description,
          category: item.category ?? undefined,
          amount: item.amount,
          receiptData: item.receiptData ?? undefined,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(claim, { status: 201 });
}
