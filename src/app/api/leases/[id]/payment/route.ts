import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lease = await prisma.leaseContract.findFirst({ where: { id, userId: session.user.id } });
  if (!lease) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { paymentDate } = body;

  const monthlyRate = lease.incrementalBorrowingRate / 12;
  const interest = lease.remainingLiability * monthlyRate;
  const principal = lease.monthlyPayment - interest;
  const newBalance = Math.max(0, lease.remainingLiability - principal);

  const [payment] = await prisma.$transaction([
    prisma.leasePayment.create({
      data: {
        leaseId: id,
        userId: session.user.id,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        amount: lease.monthlyPayment,
        principal,
        interest,
        balance: newBalance,
        posted: true,
      },
    }),
    prisma.leaseContract.update({
      where: { id },
      data: { remainingLiability: newBalance },
    }),
  ]);

  return NextResponse.json(payment, { status: 201 });
}
