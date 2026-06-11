import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePLSummary, CategorizedTransaction } from "@/lib/gemini";
import { sendEmail } from "@/lib/mailer";

/**
 * Monthly reports cron (runs on the 2nd at 07:00 UTC).
 *
 * Two-stage approval workflow:
 *   1. CRON: Generate DRAFT report from previous month's transactions (this route)
 *   2. CRON: Email the ACCOUNTANT a notification that drafts are ready for review
 *   3. UI: Accountant opens /firm/[clientId] → Reports tab → "Approve" → optionally send to client
 *   4. UI: Client receives email, clicks approval link, signs off
 *
 * The cron NEVER sends reports directly to clients. Human-in-the-loop is the point.
 */
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

  let draftsCreated = 0;
  const accountantSummaries: Array<{ accountantId: string; email: string; name: string; drafts: Array<{ clientName: string; net: number; reportId: string }> }> = [];

  for (const accountant of accountants) {
    const managedClients = await prisma.managedClient.findMany({
      where: { accountantId: accountant.id, isActive: true },
      include: {
        client: {
          select: { id: true, name: true, email: true, companyName: true, currency: true, locale: true },
        },
      },
    });

    const accountantDrafts: Array<{ clientName: string; net: number; reportId: string }> = [];

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

      // Create as DRAFT — awaiting accountant approval before going to client
      const report = await prisma.report.create({
        data: {
          userId: client.id,
          month: targetMonth,
          year: targetYear,
          status: "DRAFT",
          totalIncome: summary.totalIncome,
          totalExpenses: summary.totalExpenses,
          netProfit: summary.netProfit,
          aiSummary: summary.narrative,
          draftedAt: now,
          // clientEmail stored for later when accountant approves & sends
          clientEmail: client.email,
        },
      });

      accountantDrafts.push({
        clientName: client.companyName ?? client.name ?? client.email,
        net: summary.netProfit,
        reportId: report.id,
      });
      draftsCreated++;
    }

    if (accountantDrafts.length > 0) {
      accountantSummaries.push({
        accountantId: accountant.id,
        email: accountant.email,
        name: accountant.name ?? accountant.companyName ?? "Accountant",
        drafts: accountantDrafts,
      });
    }
  }

  // Notify accountants that drafts are ready for their review
  const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const appUrl = process.env.NEXTAUTH_URL ?? "https://ledgr.app";

  for (const summary of accountantSummaries) {
    const rows = summary.drafts
      .map((d) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(d.clientName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:${d.net >= 0 ? "#059669" : "#dc2626"}">${d.net >= 0 ? "+" : ""}${Math.round(d.net).toLocaleString()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;"><a href="${appUrl}/firm" style="color:#059669;text-decoration:none;font-weight:600">Review →</a></td>
        </tr>`)
      .join("");

    sendEmail({
      to: summary.email,
      subject: `${summary.drafts.length} ${monthName} report draft${summary.drafts.length > 1 ? "s" : ""} ready for your review`,
      html: `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden">
          <div style="padding:24px;border-bottom:1px solid #30363d;">
            <p style="font-family:monospace;font-size:11px;color:#10b981;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px">ledgr / drafts ready</p>
            <h1 style="margin:0;font-size:22px;font-weight:700">Hi ${escapeHtml(summary.name)},</h1>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;line-height:1.5">${summary.drafts.length} ${monthName} P&amp;L draft${summary.drafts.length > 1 ? "s are" : " is"} ready for your review. AI-categorized — your sign-off is required before they go to clients.</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#0d1117">
                <th style="padding:8px 12px;text-align:left;font-family:monospace;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #30363d">client</th>
                <th style="padding:8px 12px;text-align:right;font-family:monospace;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #30363d">net</th>
                <th style="padding:8px 12px;text-align:right;font-family:monospace;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #30363d">action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="padding:20px 24px;border-top:1px solid #30363d;text-align:center">
            <a href="${appUrl}/firm" style="display:inline-block;background:#10b981;color:#000;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px">Open firm workspace →</a>
            <p style="margin:16px 0 0;font-size:12px;color:#6b7280">Reports stay as DRAFT until you approve them.</p>
          </div>
        </div>
      </body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({
    draftsCreated,
    month: targetMonth,
    year: targetYear,
    accountantsNotified: accountantSummaries.length,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
