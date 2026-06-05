import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const report = await prisma.report.findUnique({
    where: { clientApprovalToken: token },
    select: {
      id: true,
      month: true,
      year: true,
      totalIncome: true,
      totalExpenses: true,
      netProfit: true,
      aiSummary: true,
      status: true,
      clientApprovedAt: true,
      clientEmail: true,
      user: { select: { name: true, email: true, companyName: true } },
    },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(report);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const report = await prisma.report.findUnique({
    where: { clientApprovalToken: token },
  });

  if (!report) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  if (report.clientApprovedAt) return NextResponse.json({ alreadyApproved: true });

  await prisma.report.update({
    where: { id: report.id },
    data: {
      clientApprovedAt: new Date(),
      status: "REVIEWED",
    },
  });

  return NextResponse.json({ success: true });
}
