import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  const resendKey = process.env.RESEND_API_KEY ?? "";
  const isDemo = !resendKey || resendKey === "demo-mode";

  let digestsSent = 0;

  const resend = isDemo ? null : new Resend(resendKey);

  for (const user of users) {
    // Transactions in last 7 days
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        status: "APPROVED",
        date: { gte: sevenDaysAgo, lte: now },
      },
      select: { amount: true, type: true },
    });

    const totalIncome = transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((s, t) => s + t.amount, 0);

    const net = totalIncome - totalExpenses;

    // Pending invoices
    const pendingInvoicesCount = await prisma.invoice.count({
      where: {
        userId: user.id,
        status: { in: ["SENT", "DRAFT"] },
      },
    });

    if (!isDemo && resend) {
      try {
        await resend.emails.send({
          from: "Ledgr <noreply@ledgr.app>",
          to: user.email,
          subject: "Your Ledgr weekly summary",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#f1f5f9;">
              <div style="background:#0f172a;padding:32px;border-radius:12px;">
                <h2 style="color:#10b981;margin-top:0;">Weekly Summary</h2>
                <p style="color:#94a3b8;">Hi ${user.name ?? user.email}, here's your Ledgr digest for the last 7 days.</p>

                <table style="width:100%;border-collapse:collapse;margin:24px 0;">
                  <tr>
                    <td style="padding:12px;background:#1e293b;border-radius:8px 0 0 0;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Income</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:600;color:#10b981;">$${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td style="padding:12px;background:#1e293b;border-radius:0 8px 0 0;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Expenses</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:600;color:#f87171;">$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px;background:#1e293b;border-radius:0 0 0 8px;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Net</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:600;color:${net >= 0 ? "#10b981" : "#f87171"};">$${net.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td style="padding:12px;background:#1e293b;border-radius:0 0 8px 0;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Pending Invoices</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:600;color:#f1f5f9;">${pendingInvoicesCount}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;color:#94a3b8;font-size:13px;">${transactions.length} approved transactions this week.</p>

                <a href="${process.env.NEXTAUTH_URL ?? "https://ledgr.app"}/dashboard"
                   style="display:inline-block;margin-top:24px;padding:12px 24px;background:#10b981;color:#000;border-radius:8px;text-decoration:none;font-weight:600;">
                  View Dashboard
                </a>

                <p style="margin-top:32px;font-size:11px;color:#475569;">Sent via Ledgr · AI-native bookkeeping</p>
              </div>
            </div>
          `,
        });
        digestsSent++;
      } catch {
        // Continue for other users
      }
    } else {
      // Demo mode — count as "sent"
      digestsSent++;
    }
  }

  return NextResponse.json({
    users: users.length,
    digestsSent,
    demoMode: isDemo,
  });
}
