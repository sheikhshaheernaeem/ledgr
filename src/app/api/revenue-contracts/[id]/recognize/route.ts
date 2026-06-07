import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { period } = body; // e.g. "2024-01-01"

  const targetPeriod = period ? new Date(period) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const schedule = await prisma.revenueSchedule.findFirst({
    where: { contractId: id, period: targetPeriod },
  });

  if (!schedule) return NextResponse.json({ error: "No schedule found for this period" }, { status: 404 });
  if (schedule.posted) return NextResponse.json({ error: "Already recognized for this period" }, { status: 400 });

  const updated = await prisma.revenueSchedule.update({
    where: { id: schedule.id },
    data: {
      recognizedAmount: schedule.scheduledAmount,
      deferredAmount: 0,
      posted: true,
    },
  });

  return NextResponse.json(updated);
}
