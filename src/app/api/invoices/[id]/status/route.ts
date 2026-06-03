import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { Resend } from "resend";

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
        const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        const payBtn = user?.paymentLink
          ? `<p style="margin-top:24px;text-align:center"><a href="${user.paymentLink}" style="background:#059669;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">Pay Now</a></p>`
          : "";
        await resend.emails.send({
          from: fromEmail,
          to: existing.clientEmail,
          subject: `Invoice ${existing.invoiceNumber} from ${senderName} — ${fmt(existing.total)} due`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
              <h2 style="color:#059669">Invoice ${existing.invoiceNumber}</h2>
              <p>Hi ${existing.clientName},</p>
              <p>${senderName} has sent you an invoice for <strong>${fmt(existing.total)}</strong>, due on <strong>${new Date(existing.dueDate).toLocaleDateString("en-US", { year:"numeric",month:"long",day:"numeric" })}</strong>.</p>
              ${payBtn}
              <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
              <p style="font-size:12px;color:#999">Sent via Ledgr · AI-native bookkeeping</p>
            </div>`,
        });
      }
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json(updated);
}
