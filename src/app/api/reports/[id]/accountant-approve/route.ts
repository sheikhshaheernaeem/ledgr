import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { reportApprovalEmail } from "@/lib/email-templates";

/**
 * Accountant approves a draft report.
 *
 * Flow:
 *  - DRAFT → ACCOUNTANT_APPROVED (accountantApprovedAt set)
 *  - If body.sendToClient=true, also: status → SENT, email client with approval link
 *
 * Only ACCOUNTANT or ADMIN may approve; they must have a managed-client link to the report's owner
 * (or be ADMIN).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only an accountant or admin can approve a report" }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: must own a ManagedClient link or be ADMIN
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: sessionUserId, clientId: report.userId } },
    });
    if (!mc?.isActive) return NextResponse.json({ error: "Not your client" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { sendToClient = false, clientEmail, revisionNotes } = body as {
    sendToClient?: boolean;
    clientEmail?: string;
    revisionNotes?: string;
  };

  const now = new Date();
  const data: Record<string, unknown> = {
    accountantApprovedAt: now,
    accountantApprovedById: sessionUserId,
    status: "ACCOUNTANT_APPROVED",
  };
  if (revisionNotes !== undefined) data.revisionNotes = revisionNotes;

  // If sending to client, generate token + email
  let approvalUrl: string | undefined;
  if (sendToClient) {
    const client = await prisma.user.findUnique({
      where: { id: report.userId },
      select: { email: true, name: true, companyName: true },
    });
    const recipient = clientEmail?.trim() || client?.email;
    if (!recipient) {
      return NextResponse.json({ error: "Client has no email and none provided" }, { status: 400 });
    }
    const token = report.clientApprovalToken ?? crypto.randomUUID().replace(/-/g, "");
    data.clientApprovalToken = token;
    data.clientEmail = recipient;
    data.status = "SENT";
    data.sentAt = now;

    const accountant = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { name: true, companyName: true },
    });
    const senderName = accountant?.companyName ?? accountant?.name ?? "Your bookkeeper";
    approvalUrl = `${process.env.NEXTAUTH_URL ?? "https://ledgr.app"}/p/report/${token}`;
    const monthName = new Date(report.year, report.month - 1).toLocaleString("default", { month: "long", year: "numeric" });

    sendEmail({
      to: recipient,
      subject: `Your ${monthName} P&L Report is ready for review — ${senderName}`,
      html: reportApprovalEmail({
        monthName,
        senderName,
        clientEmail: recipient,
        approvalUrl,
        totalIncome: report.totalIncome,
        totalExpenses: report.totalExpenses,
        netProfit: report.netProfit,
      }),
    }).catch(() => {});
  }

  const updated = await prisma.report.update({ where: { id }, data });

  return NextResponse.json({
    success: true,
    report: updated,
    sent: sendToClient,
    approvalUrl,
  });
}
