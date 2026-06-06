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

  // Auto-calculate taxes for each employee
  const computedEmployees = (employees ?? []).map((e) => {
    const grossPay = e.grossPay || 0;
    const socialSecurity = e.socialSecurity !== 0 ? (e.socialSecurity ?? 0) : +(grossPay * 0.062).toFixed(2);
    const medicare = e.medicare !== 0 ? (e.medicare ?? 0) : +(grossPay * 0.0145).toFixed(2);
    const stateTax = e.stateTax ?? 0;
    const otherDeductions = e.otherDeductions ?? 0;

    let federalTax = e.federalTax ?? 0;
    if (federalTax === 0) {
      // Annualize grossPay to compute federal tax using 2024 single-filer brackets
      const annualGross = grossPay * 26; // assume bi-weekly; just use gross as annual if no period
      let annualFed = 0;
      if (annualGross <= 11600) {
        annualFed = annualGross * 0.10;
      } else if (annualGross <= 47150) {
        annualFed = 11600 * 0.10 + (annualGross - 11600) * 0.12;
      } else if (annualGross <= 100525) {
        annualFed = 11600 * 0.10 + (47150 - 11600) * 0.12 + (annualGross - 47150) * 0.22;
      } else {
        annualFed = 11600 * 0.10 + (47150 - 11600) * 0.12 + (100525 - 47150) * 0.22 + (annualGross - 100525) * 0.24;
      }
      federalTax = +(annualFed / 26).toFixed(2);
    }

    const netPay = +(grossPay - federalTax - stateTax - socialSecurity - medicare - otherDeductions).toFixed(2);

    return {
      ...e,
      socialSecurity,
      medicare,
      federalTax,
      stateTax,
      otherDeductions,
      netPay: e.netPay && e.netPay !== 0 ? e.netPay : netPay,
    };
  });

  // Auto-generate run number
  const count = await prisma.payrollRun.count({ where: { userId } });
  const runNumber = `PR-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals
  const totalGross = computedEmployees.reduce((sum, e) => sum + (e.grossPay || 0), 0);
  const totalTax = computedEmployees.reduce(
    (sum, e) => sum + (e.federalTax || 0) + (e.stateTax || 0) + (e.socialSecurity || 0) + (e.medicare || 0),
    0
  );
  const totalNet = computedEmployees.reduce((sum, e) => sum + (e.netPay || 0), 0);

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
        create: computedEmployees.map((e) => ({
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

  // Auto-post GL journal entry when status is POSTED
  if ((status ?? "DRAFT") === "POSTED") {
    try {
      const [expenseAccount, taxPayableAccount, cashAccount] = await Promise.all([
        prisma.chartOfAccount.findFirst({ where: { userId, code: "6100" } }),
        prisma.chartOfAccount.findFirst({ where: { userId, code: "2100" } }),
        prisma.chartOfAccount.findFirst({ where: { userId, code: "1000" } }),
      ]);

      if (expenseAccount && taxPayableAccount && cashAccount) {
        const entryNumber = `PAY-${runNumber}`;
        await prisma.journalEntry.create({
          data: {
            userId,
            entryNumber,
            date: new Date(payDate),
            description: `Payroll Run ${runNumber}`,
            type: "PAYROLL",
            status: "POSTED",
            lines: {
              create: [
                {
                  accountId: expenseAccount.id,
                  description: "Payroll expense",
                  debit: totalGross,
                  credit: 0,
                },
                {
                  accountId: taxPayableAccount.id,
                  description: "Payroll taxes payable",
                  debit: 0,
                  credit: totalTax,
                },
                {
                  accountId: cashAccount.id,
                  description: "Payroll net pay",
                  debit: 0,
                  credit: totalNet,
                },
              ],
            },
          },
        });
      }
    } catch {
      console.error("Failed to auto-post GL entry for payroll:", run.id);
    }
  }

  return NextResponse.json(run, { status: 201 });
}
