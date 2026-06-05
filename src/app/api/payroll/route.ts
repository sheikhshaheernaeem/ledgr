import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const runs = await prisma.payrollRun.findMany({
    where: { userId },
    include: {
      employees: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { periodStart, periodEnd, payDate, notes, employees, status } = body as {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    notes?: string;
    status?: string;
    employees: Array<{
      employeeName: string;
      employeeId?: string;
      payType: string;
      hoursWorked?: number;
      hourlyRate?: number;
      grossPay: number;
      federalTax: number;
      stateTax: number;
      socialSecurity: number;
      medicare: number;
      otherDeductions: number;
      netPay: number;
      is1099: boolean;
    }>;
  };

  if (!periodStart || !periodEnd || !payDate) {
    return NextResponse.json({ error: "periodStart, periodEnd, payDate are required" }, { status: 400 });
  }

  // Auto-generate run number
  const count = await prisma.payrollRun.count({ where: { userId } });
  const runNumber = `PR-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals
  const totalGross = (employees ?? []).reduce((sum, e) => sum + (e.grossPay || 0), 0);
  const totalTax = (employees ?? []).reduce(
    (sum, e) => sum + (e.federalTax || 0) + (e.stateTax || 0) + (e.socialSecurity || 0) + (e.medicare || 0),
    0
  );
  const totalNet = (employees ?? []).reduce((sum, e) => sum + (e.netPay || 0), 0);

  const run = await prisma.payrollRun.create({
    data: {
      userId,
      runNumber,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      payDate: new Date(payDate),
      totalGross,
      totalTax,
      totalNet,
      status: status ?? "DRAFT",
      notes: notes ?? null,
      employees: {
        create: (employees ?? []).map((e) => ({
          userId,
          employeeName: e.employeeName,
          employeeId: e.employeeId ?? null,
          payType: e.payType ?? "SALARY",
          hoursWorked: e.hoursWorked ?? null,
          hourlyRate: e.hourlyRate ?? null,
          grossPay: e.grossPay,
          federalTax: e.federalTax ?? 0,
          stateTax: e.stateTax ?? 0,
          socialSecurity: e.socialSecurity ?? 0,
          medicare: e.medicare ?? 0,
          otherDeductions: e.otherDeductions ?? 0,
          netPay: e.netPay,
          is1099: e.is1099 ?? false,
        })),
      },
    },
    include: { employees: true },
  });

  return NextResponse.json(run, { status: 201 });
}
