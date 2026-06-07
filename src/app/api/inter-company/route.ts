import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txns = await prisma.interCompanyTransaction.findMany({
    where: { userId: session.user.id },
    include: { fromEntity: true, toEntity: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(txns);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { fromEntityId, toEntityId, amount, currency, description, date } = body;

    if (!fromEntityId || !toEntityId || !amount || !description || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const txn = await prisma.interCompanyTransaction.create({
      data: {
        userId: session.user.id,
        fromEntityId,
        toEntityId,
        amount: parseFloat(amount),
        currency: currency || "USD",
        description,
        date: new Date(date),
      },
      include: { fromEntity: true, toEntity: true },
    });

    return NextResponse.json(txn, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
