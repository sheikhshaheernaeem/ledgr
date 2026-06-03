import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { invoiceReminderEmail } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  // Auth: Bearer token or internal call
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all SENT invoices past their due date with a client email
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "SENT",
      dueDate: { lt: now },
      clientEmail: { not: null },
    },
    include: { user: true },
  });

  if (overdueInvoices.length === 0) {
    return NextResponse.json({ updated: 0, emailsSent: 0 });
  }

  // Mark all as OVERDUE
  const ids = overdueInvoices.map((inv) => inv.id);
  await prisma.invoice.updateMany({
    where: { id: { in: ids } },
    data: { status: "OVERDUE" },
  });

  const resendKey = process.env.RESEND_API_KEY ?? "";
  const isDemo = !resendKey || resendKey === "demo-mode";

  let emailsSent = 0;

  if (!isDemo) {
    const resend = new Resend(resendKey);

    for (const inv of overdueInvoices) {
      if (!inv.clientEmail) continue;

      try {
        const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000));
        await resend.emails.send({
          from: "Ledgr <noreply@ledgr.app>",
          to: inv.clientEmail,
          subject: `Reminder: Invoice ${inv.invoiceNumber} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
          html: invoiceReminderEmail({
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            senderName: inv.user.name ?? "Your service provider",
            amount: inv.total,
            currency: (inv as { currency?: string }).currency ?? "USD",
            dueDate: inv.dueDate,
            daysOverdue,
            paymentLink: (inv.user as { paymentLink?: string | null }).paymentLink ?? null,
          }),
        });
        emailsSent++;
      } catch {
        // Continue sending to others even if one fails
      }
    }
  }

  return NextResponse.json({
    updated: overdueInvoices.length,
    emailsSent,
    demoMode: isDemo,
  });
}
