import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({
    where: { id, userId },
    include: { employees: true },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({ where: { id, userId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (run.status === "PROCESSED") {
    const body = await req.json();
    // Only allow voiding a PROCESSED run
    if (body.status === "VOID") {
      const updated = await prisma.payrollRun.update({
        where: { id },
        data: { status: "VOID" },
        include: { employees: true },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Cannot edit a PROCESSED payroll run" }, { status: 400 });
  }

  const body = await req.json();
  const { status, notes } = body;

  const updated = await prisma.payrollRun.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { employees: true },
  });

  // Auto-post GL journal entry when transitioning to POSTED
  if (status === "POSTED" && run.status !== "POSTED") {
    try {
      const [expenseAccount, taxPayableAccount, cashAccount] = await Promise.all([
        prisma.chartOfAccount.findFirst({ where: { userId, code: "6100" } }),
        prisma.chartOfAccount.findFirst({ where: { userId, code: "2100" } }),
        prisma.chartOfAccount.findFirst({ where: { userId, code: "1000" } }),
      ]);

      if (expenseAccount && taxPayableAccount && cashAccount) {
        const entryNumber = `PAY-${run.runNumber}`;
        await prisma.journalEntry.create({
          data: {
            userId,
            entryNumber,
            date: run.payDate,
            description: `Payroll Run ${run.runNumber}`,
            type: "PAYROLL",
            status: "POSTED",
            lines: {
              create: [
                {
                  accountId: expenseAccount.id,
                  description: "Payroll expense",
                  debit: run.totalGross,
                  credit: 0,
                },
                {
                  accountId: taxPayableAccount.id,
                  description: "Payroll taxes payable",
                  debit: 0,
                  credit: run.totalTax,
                },
                {
                  accountId: cashAccount.id,
                  description: "Payroll net pay",
                  debit: 0,
                  credit: run.totalNet,
                },
              ],
            },
          },
        });
      }
    } catch {
      console.error("Failed to auto-post GL entry for payroll:", id);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({ where: { id, userId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status !== "DRAFT") return NextResponse.json({ error: "Only DRAFT payroll runs can be deleted" }, { status: 400 });

  await prisma.payrollRun.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
