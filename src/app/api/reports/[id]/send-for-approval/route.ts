import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { reportApprovalEmail } from "@/lib/email-templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const report = await prisma.report.findFirst({ where: { id, userId } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { clientEmail } = await req.json();
  if (!clientEmail?.trim()) return NextResponse.json({ error: "clientEmail is required" }, { status: 400 });

  const token = report.clientApprovalToken ?? crypto.randomUUID().replace(/-/g, "");

  await prisma.report.update({
    where: { id },
    data: {
      clientApprovalToken: token,
      clientEmail: clientEmail.trim(),
      status: "SENT",
      sentAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, companyName: true } });
  const senderName = user?.companyName ?? user?.name ?? "Your bookkeeper";
  const approvalUrl = `${process.env.NEXTAUTH_URL ?? "https://ledgr.app"}/p/report/${token}`;
  const monthName = new Date(report.year, report.month - 1).toLocaleString("default", { month: "long", year: "numeric" });

  sendEmail({
    to: clientEmail.trim(),
    subject: `Your ${monthName} P&L Report is ready for review — ${senderName}`,
    html: reportApprovalEmail({
      monthName,
      senderName,
      clientEmail: clientEmail.trim(),
      approvalUrl,
      totalIncome: report.totalIncome,
      totalExpenses: report.totalExpenses,
      netProfit: report.netProfit,
    }),
  }).catch(() => {});

  return NextResponse.json({ success: true, token, approvalUrl });
}
