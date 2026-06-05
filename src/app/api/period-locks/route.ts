import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locks = await prisma.lockedPeriod.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(locks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { year, month, notes } = body as { year: number; month: number; notes?: string };

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "month must be between 1 and 12" }, { status: 400 });
  }

  // Check if already locked
  const existing = await prisma.lockedPeriod.findUnique({
    where: { userId_year_month: { userId: session.user.id, year, month } },
  });

  if (existing) {
    return NextResponse.json({ error: "Period is already locked" }, { status: 409 });
  }

  const lock = await prisma.lockedPeriod.create({
    data: {
      userId: session.user.id,
      year,
      month,
      lockedBy: session.user.id,
      notes: notes ?? undefined,
    },
  });

  return NextResponse.json(lock, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { year, month } = body as { year: number; month: number };

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const existing = await prisma.lockedPeriod.findUnique({
    where: { userId_year_month: { userId: session.user.id, year, month } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Period is not locked" }, { status: 404 });
  }

  await prisma.lockedPeriod.delete({
    where: { userId_year_month: { userId: session.user.id, year, month } },
  });

  return NextResponse.json({ success: true });
}
