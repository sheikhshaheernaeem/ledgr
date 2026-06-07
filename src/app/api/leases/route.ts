import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leases = await prisma.leaseContract.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { payments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leases);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { leaseNumber, lessorName, assetDescription, leaseType, commencementDate, endDate, monthlyPayment, incrementalBorrowingRate, notes } = body;

    if (!leaseNumber || !lessorName || !commencementDate || !endDate || !monthlyPayment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(commencementDate);
    const end = new Date(endDate);
    const ibr = parseFloat(incrementalBorrowingRate || "0.05");
    const payment = parseFloat(monthlyPayment);
    const monthlyRate = ibr / 12;

    // Calculate number of months
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    // Calculate present value of lease liability
    let leaseLiability = 0;
    if (monthlyRate > 0) {
      leaseLiability = payment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
    } else {
      leaseLiability = payment * months;
    }

    const lease = await prisma.leaseContract.create({
      data: {
        userId: session.user.id,
        leaseNumber,
        lessorName,
        assetDescription,
        leaseType: leaseType || "OPERATING",
        commencementDate: start,
        endDate: end,
        monthlyPayment: payment,
        incrementalBorrowingRate: ibr,
        rightOfUseAsset: leaseLiability,
        leaseLiability,
        remainingLiability: leaseLiability,
        notes: notes || null,
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Lease number already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
