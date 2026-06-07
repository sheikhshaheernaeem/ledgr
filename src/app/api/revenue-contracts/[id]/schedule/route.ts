import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const schedules = await prisma.revenueSchedule.findMany({
    where: { contractId: id },
    orderBy: { period: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({
    where: { id, userId: session.user.id },
    include: { obligations: true },
  });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear existing schedule
  await prisma.revenueSchedule.deleteMany({ where: { contractId: id } });

  const schedules = [];

  if (contract.recognitionMethod === "STRAIGHT_LINE") {
    const start = new Date(contract.startDate);
    const end = contract.endDate ? new Date(contract.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), 1);
    const monthsDiff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const monthlyAmount = contract.totalValue / monthsDiff;

    for (let i = 0; i < monthsDiff; i++) {
      const period = new Date(start.getFullYear(), start.getMonth() + i, 1);
      schedules.push({
        contractId: id,
        userId: session.user.id,
        period,
        scheduledAmount: monthlyAmount,
        recognizedAmount: 0,
        deferredAmount: monthlyAmount,
      });
    }
  } else if (contract.recognitionMethod === "MILESTONE") {
    // One schedule entry per performance obligation satisfied date
    for (const ob of contract.obligations) {
      if (ob.satisfiedAt) {
        const period = new Date(ob.satisfiedAt.getFullYear(), ob.satisfiedAt.getMonth(), 1);
        schedules.push({
          contractId: id,
          userId: session.user.id,
          period,
          scheduledAmount: ob.allocatedValue,
          recognizedAmount: 0,
          deferredAmount: ob.allocatedValue,
        });
      }
    }
  } else {
    // PERCENTAGE_COMPLETE: create one entry per month, evenly distributed
    const start = new Date(contract.startDate);
    const end = contract.endDate ? new Date(contract.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), 1);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const monthlyAmount = contract.totalValue / monthsDiff;

    for (let i = 0; i < monthsDiff; i++) {
      const period = new Date(start.getFullYear(), start.getMonth() + i, 1);
      schedules.push({
        contractId: id,
        userId: session.user.id,
        period,
        scheduledAmount: monthlyAmount,
        recognizedAmount: 0,
        deferredAmount: monthlyAmount,
      });
    }
  }

  if (schedules.length > 0) {
    await prisma.revenueSchedule.createMany({ data: schedules, skipDuplicates: true });
  }

  const result = await prisma.revenueSchedule.findMany({
    where: { contractId: id },
    orderBy: { period: "asc" },
  });

  return NextResponse.json(result, { status: 201 });
}
