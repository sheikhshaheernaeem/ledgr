import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePLSummary, CategorizedTransaction } from "@/lib/gemini";
import { sendEmail } from "@/lib/mailer";
import { monthlyReportEmail } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  const accountants = await prisma.user.findMany({
    where: { managedClients: { some: { isActive: true } } },
    select: { id: true, name: true, email: true, companyName: true },
  });

  let reportsGenerated = 0;

  for (const accountant of accountants) {
    const managedClients = await prisma.managedClient.findMany({
      where: { accountantId: accountant.id, isActive: true },
      include: {
        client: {
          select: { id: true, name: true, email: true, companyName: true, currency: true, locale: true },
        },
      },
    });

    for (const { client } of managedClients) {
      const existing = await prisma.report.findFirst({
        where: { userId: client.id, month: targetMonth, year: targetYear },
      });
      if (existing) continue;

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: client.id,
          date: { gte: monthStart, lte: monthEnd },
          status: { not: "ARCHIVED" },
        },
        select: { date: true, description: true, amount: true, type: true, category: true, subcategory: true, confidence: true, aiNotes: true },
      });

      if (transactions.length === 0) continue;

      const txForAI: CategorizedTransaction[] = transactions.map((t) => ({
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        amount: t.amount,
        type: t.type as "DEBIT" | "CREDIT",
        category: t.category ?? "Other Expense",
        subcategory: t.subcategory ?? "Miscellaneous",
        confidence: t.confidence ?? 0.8,
        aiNotes: t.aiNotes ?? undefined,
      }));

      const summary = await generatePLSummary(txForAI, targetMonth, targetYear);

      const approvalToken = `${client.id}-${targetMonth}-${targetYear}-${Date.now()}`;

      const report = await prisma.report.create({
        data: {
          userId: client.id,
          month: targetMonth,
          year: targetYear,
          status: "SENT",
          totalIncome: summary.totalIncome,
          totalExpenses: summary.totalExpenses,
          netProfit: summary.netProfit,
          aiSummary: summary.narrative,
          sentAt: now,
          clientApprovalToken: approvalToken,
          clientEmail: client.email,
        },
      });

      const currency = client.currency ?? "USD";
      const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      const appUrl = process.env.NEXTAUTH_URL ?? "https://ledgr.app";

      await sendEmail({
        to: client.email,
        subject: `Your ${monthName} Financial Report — ${client.companyName ?? client.name ?? "Your Business"}`,
        html: monthlyReportEmail({
          clientName: client.name ?? client.email,
          companyName: client.companyName ?? "",
          accountantName: accountant.companyName ?? accountant.name ?? "Your Accountant",
          month: monthName,
          totalIncome: summary.totalIncome,
          totalExpenses: summary.totalExpenses,
          netProfit: summary.netProfit,
          currency,
          topExpenses: summary.topExpenseCategories,
          narrative: summary.narrative,
          approvalUrl: `${appUrl}/reports/${report.id}/approve?token=${approvalToken}`,
          dashboardUrl: `${appUrl}/client`,
        }),
      });

      reportsGenerated++;
    }
  }

  return NextResponse.json({ reportsGenerated, month: targetMonth, year: targetYear });
}
