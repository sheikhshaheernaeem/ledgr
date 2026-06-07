import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lease = await prisma.leaseContract.findFirst({ where: { id, userId: session.user.id } });
  if (!lease) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if schedule already exists
  const existing = await prisma.leaseAmortization.findMany({
    where: { leaseId: id },
    orderBy: { period: "asc" },
  });

  if (existing.length > 0) return NextResponse.json(existing);

  // Generate amortization schedule
  const ibr = lease.incrementalBorrowingRate;
  const monthlyRate = ibr / 12;
  const payment = lease.monthlyPayment;
  const start = new Date(lease.commencementDate);
  const end = new Date(lease.endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  let balance = lease.leaseLiability;
  const scheduleData = [];

  for (let i = 0; i < months; i++) {
    const period = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    balance = Math.max(0, balance - principal);

    scheduleData.push({
      leaseId: id,
      period,
      payment,
      interest,
      principal,
      balance,
    });
  }

  if (scheduleData.length > 0) {
    await prisma.leaseAmortization.createMany({ data: scheduleData, skipDuplicates: true });
  }

  const result = await prisma.leaseAmortization.findMany({
    where: { leaseId: id },
    orderBy: { period: "asc" },
  });

  return NextResponse.json(result);
}
