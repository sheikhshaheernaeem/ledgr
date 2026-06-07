import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public route - no auth required
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.vendorPortalInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite has expired" }, { status: 410 });

  const body = await request.json();
  const { amount, currency, dueDate, description, attachmentData } = body;

  if (!amount || !dueDate || !description) {
    return NextResponse.json({ error: "Amount, due date, and description are required" }, { status: 400 });
  }

  const submission = await prisma.vendorBillSubmission.create({
    data: {
      inviteId: invite.id,
      vendorName: invite.vendorName,
      amount: parseFloat(amount),
      currency: currency || "USD",
      dueDate: new Date(dueDate),
      description,
      attachmentData: attachmentData || null,
      status: "SUBMITTED",
    },
  });

  // Mark invite as accepted if first submission
  if (invite.status === "PENDING") {
    await prisma.vendorPortalInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
  }

  return NextResponse.json({ success: true, submissionId: submission.id }, { status: 201 });
}
