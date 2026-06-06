import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/mailer";
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

  if (status === "SENT" && existing.clientEmail) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { name: true, paymentLink: true },
    });
    sendEmail({
      to: existing.clientEmail,
      subject: `Invoice ${existing.invoiceNumber} from ${user?.name ?? "Your service provider"}`,
      html: invoiceSentEmail({
        invoiceNumber: existing.invoiceNumber,
        clientName: existing.clientName,
        senderName: user?.name ?? "Your service provider",
        amount: existing.total,
        currency: existing.currency ?? "USD",
        dueDate: existing.dueDate,
        paymentLink: user?.paymentLink ?? null,
      }),
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}
