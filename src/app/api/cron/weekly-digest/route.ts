import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
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

  let digestsSent = 0;

  for (const user of users) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        status: "APPROVED",
        date: { gte: sevenDaysAgo, lte: now },
      },
      select: { amount: true, type: true },
    });

    const totalIncome = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    const net = totalIncome - totalExpenses;

    const pendingInvoicesCount = await prisma.invoice.count({
      where: { userId: user.id, status: { in: ["SENT", "DRAFT"] } },
    });

    try {
      const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "https://ledgr.app"}/dashboard`;
      await sendEmail({
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
  }

  return NextResponse.json({ users: users.length, digestsSent });
}
