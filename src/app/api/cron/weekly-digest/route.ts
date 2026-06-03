import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { weeklyDigestEmail } from "@/lib/email-templates";

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
        const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "https://ledgr.app"}/dashboard`;
        await resend.emails.send({
          from: "Ledgr <noreply@ledgr.app>",
          to: user.email,
          subject: "Your Ledgr weekly summary",
          html: weeklyDigestEmail({
            userName: user.name ?? user.email,
            income: totalIncome,
            expenses: totalExpenses,
            net,
            currency: "USD",
            pendingInvoices: pendingInvoicesCount,
            dashboardUrl,
            weekStart: sevenDaysAgo,
            weekEnd: now,
          }),
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
