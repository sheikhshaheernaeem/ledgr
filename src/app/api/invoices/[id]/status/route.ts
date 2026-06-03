import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { Resend } from "resend";
import { invoiceSentEmail } from "@/lib/email-templates";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status } = body as { status: string };

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Invoice",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status, paidAt: updated.paidAt },
  });

  // Send email notification when invoice is marked SENT and client has an email
  if (status === "SENT" && existing.clientEmail) {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@ledgr.app";
      if (resendKey && resendKey !== "demo-mode") {
        const resend = new Resend(resendKey);
        const user = await prisma.user.findUnique({ where: { id: session.user.id as string }, select: { name: true, paymentLink: true } });
        const senderName = user?.name ?? "Your service provider";
        await resend.emails.send({
          from: fromEmail,
          to: existing.clientEmail,
          subject: `Invoice ${existing.invoiceNumber} from ${senderName}`,
          html: invoiceSentEmail({
            invoiceNumber: existing.invoiceNumber,
            clientName: existing.clientName,
            senderName,
            amount: existing.total,
            currency: existing.currency ?? "USD",
            dueDate: existing.dueDate,
            paymentLink: user?.paymentLink ?? null,
          }),
        });
      }
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json(updated);
}
