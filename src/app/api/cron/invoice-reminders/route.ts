import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

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
        await resend.emails.send({
          from: "Ledgr <noreply@ledgr.app>",
          to: inv.clientEmail,
          subject: `Reminder: Invoice ${inv.invoiceNumber} is overdue`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#10b981;">Payment Reminder</h2>
              <p>Dear ${inv.clientName},</p>
              <p>
                This is a friendly reminder that invoice <strong>${inv.invoiceNumber}</strong>
                for <strong>$${inv.total.toFixed(2)}</strong> was due on
                <strong>${inv.dueDate.toLocaleDateString()}</strong> and is now overdue.
              </p>
              <p>Please arrange payment at your earliest convenience.</p>
              <br/>
              <p style="color:#6b7280;font-size:12px;">Sent via Ledgr · AI-native bookkeeping</p>
            </div>
          `,
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
