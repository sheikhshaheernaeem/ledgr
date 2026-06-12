import { prisma } from "@/lib/db";
import {
  TrendingUp, AlertTriangle, CheckCircle2, Sparkles, Receipt, Wallet, Clock,
} from "lucide-react";

interface Insight {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "good" | "warn" | "bad" | "neutral";
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

const toneStyles = {
  good: { ring: "border-emerald-500/30 bg-emerald-500/[0.05]", iconBg: "bg-emerald-500/15 text-emerald-400" },
  warn: { ring: "border-amber-500/30 bg-amber-500/[0.05]", iconBg: "bg-amber-500/15 text-amber-400" },
  bad: { ring: "border-rose-500/30 bg-rose-500/[0.05]", iconBg: "bg-rose-500/15 text-rose-400" },
  neutral: { ring: "border-border bg-card/40", iconBg: "bg-muted text-foreground" },
};

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });

async function computeInsights(userId: string): Promise<Insight[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const [user, thisMonthTxns, lastMonthTxns, last90Txns, ytdTxns, openInvoices, openBills, bankAccounts, anomalies] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true, defaultTaxRate: true } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: monthStart } }, select: { type: true, amount: true, category: true } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } }, select: { type: true, amount: true, category: true } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: ninetyDaysAgo } }, select: { type: true, amount: true, category: true, date: true } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: ytdStart } }, select: { type: true, amount: true } }),
    prisma.invoice.findMany({ where: { userId, status: { in: ["SENT", "OVERDUE"] } }, select: { total: true, dueDate: true, status: true } }),
    prisma.bill.findMany({ where: { userId, status: { in: ["PENDING", "OVERDUE"] } }, select: { total: true, amountPaid: true, dueDate: true } }),
    prisma.bankAccount.findMany({ where: { userId }, select: { currentBalance: true } }),
    prisma.anomalyFlag.findMany({ where: { userId, dismissed: false }, select: { severity: true } }),
  ]);

  const currency = user?.currency ?? "USD";
  const insights: Insight[] = [];

  // 1. Category spend MoM change
  const thisCat: Record<string, number> = {};
  const lastCat: Record<string, number> = {};
  for (const t of thisMonthTxns) if (t.type === "DEBIT" && t.category) thisCat[t.category] = (thisCat[t.category] ?? 0) + t.amount;
  for (const t of lastMonthTxns) if (t.type === "DEBIT" && t.category) lastCat[t.category] = (lastCat[t.category] ?? 0) + t.amount;

  let biggestSpike: { cat: string; thisAmt: number; lastAmt: number; pct: number } | null = null;
  for (const [cat, thisAmt] of Object.entries(thisCat)) {
    const lastAmt = lastCat[cat] ?? 0;
    if (lastAmt < 50) continue; // skip noise
    const pct = ((thisAmt - lastAmt) / lastAmt) * 100;
    if (pct > 30 && (!biggestSpike || pct > biggestSpike.pct)) {
      biggestSpike = { cat, thisAmt, lastAmt, pct };
    }
  }
  if (biggestSpike) {
    insights.push({
      id: "spend-spike",
      icon: TrendingUp,
      tone: "warn",
      title: `${biggestSpike.cat} spend up ${biggestSpike.pct.toFixed(0)}%`,
      body: `You spent ${fmt(biggestSpike.thisAmt, currency)} this month vs ${fmt(biggestSpike.lastAmt, currency)} last month. Worth a look?`,
      cta: { label: "View transactions", href: "/client/transactions" },
    });
  }

  // 2. Runway
  const cashOnHand = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const last3MonthsStart = new Date(now); last3MonthsStart.setMonth(now.getMonth() - 3);
  const last90Expense = last90Txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const last90Revenue = last90Txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const monthlyBurn = (last90Expense - last90Revenue) / 3;
  if (cashOnHand > 0) {
    if (monthlyBurn <= 0) {
      insights.push({
        id: "runway-profitable",
        icon: TrendingUp,
        tone: "good",
        title: "You're cash-flow positive",
        body: `Operations generated more cash than you spent over the last 90 days. Runway is effectively unlimited at this rate.`,
        cta: { label: "See financials", href: "/client/financials" },
      });
    } else {
      const runway = cashOnHand / monthlyBurn;
      const tone: Insight["tone"] = runway > 12 ? "good" : runway > 6 ? "warn" : "bad";
      insights.push({
        id: "runway",
        icon: runway > 12 ? TrendingUp : Wallet,
        tone,
        title: `${runway.toFixed(1)} months of runway`,
        body: `${fmt(cashOnHand, currency)} cash on hand at ${fmt(monthlyBurn, currency)}/mo burn. ${runway > 12 ? "Healthy reserves." : runway > 6 ? "Plan ahead." : "Action required — talk to your accountant."}`,
        cta: { label: "See runway", href: "/client/financials" },
      });
    }
  }

  // 3. Overdue invoices
  const overdueInvs = openInvoices.filter((i) => i.status === "OVERDUE" || new Date(i.dueDate) < now);
  const overdueAmount = overdueInvs.reduce((s, i) => s + i.total, 0);
  if (overdueAmount > 0) {
    insights.push({
      id: "overdue-ar",
      icon: AlertTriangle,
      tone: "bad",
      title: `${fmt(overdueAmount, currency)} in overdue invoices`,
      body: `${overdueInvs.length} invoice${overdueInvs.length > 1 ? "s" : ""} past due. Chase them — this is real cash you've already earned.`,
      cta: { label: "View AR aging", href: "/client/financials" },
    });
  }

  // 4. Uncategorized items
  const uncat = last90Txns.filter((t) => !t.category || t.category === "Uncategorized");
  const uncatAmount = uncat.reduce((s, t) => s + t.amount, 0);
  if (uncat.length >= 5 || uncatAmount > 500) {
    insights.push({
      id: "uncategorized",
      icon: Receipt,
      tone: "warn",
      title: `${uncat.length} uncategorized transaction${uncat.length > 1 ? "s" : ""}`,
      body: `Worth ${fmt(uncatAmount, currency)}. Your accountant is reviewing — some may be tax-deductible.`,
      cta: { label: "Review transactions", href: "/client/transactions" },
    });
  }

  // 5. Tax estimate
  const ytdRevenue = ytdTxns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const ytdExpense = ytdTxns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const ytdProfit = ytdRevenue - ytdExpense;
  if (ytdProfit > 1000) {
    const taxRate = user?.defaultTaxRate ?? 0.25;
    const taxOwed = ytdProfit * taxRate;
    insights.push({
      id: "tax-estimate",
      icon: Receipt,
      tone: "neutral",
      title: `${fmt(taxOwed, currency)} estimated tax`,
      body: `Based on ${fmt(ytdProfit, currency)} YTD profit at ${(taxRate * 100).toFixed(0)}% rate. Quarterly payments help you avoid penalties.`,
      cta: { label: "Tax dashboard", href: "/client/tax" },
    });
  }

  // 6. AP — overdue bills
  const overdueBills = openBills.filter((b) => new Date(b.dueDate) < now);
  const apOverdue = overdueBills.reduce((s, b) => s + Math.max(0, b.total - b.amountPaid), 0);
  if (apOverdue > 0) {
    insights.push({
      id: "overdue-ap",
      icon: Clock,
      tone: "warn",
      title: `${fmt(apOverdue, currency)} in overdue bills`,
      body: `${overdueBills.length} bill${overdueBills.length > 1 ? "s" : ""} past due — late fees may apply.`,
      cta: { label: "View AP aging", href: "/client/financials" },
    });
  }

  // 7. Anomalies flagged
  const highSeverity = anomalies.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  if (highSeverity > 0) {
    insights.push({
      id: "anomalies",
      icon: AlertTriangle,
      tone: "bad",
      title: `${highSeverity} high-severity flag${highSeverity > 1 ? "s" : ""}`,
      body: `Your accountant flagged unusual transactions for your review. Could be duplicates or fraud signals.`,
      cta: { label: "Message your accountant", href: "/client/messages" },
    });
  }

  // 8. Positive momentum signal (revenue growth)
  const thisRevenue = thisMonthTxns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const lastRevenue = lastMonthTxns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  if (lastRevenue > 100 && thisRevenue > lastRevenue * 1.15) {
    const growth = ((thisRevenue - lastRevenue) / lastRevenue) * 100;
    insights.push({
      id: "revenue-growth",
      icon: TrendingUp,
      tone: "good",
      title: `Revenue up ${growth.toFixed(0)}% MoM`,
      body: `${fmt(thisRevenue, currency)} this month vs ${fmt(lastRevenue, currency)} last. Keep it up.`,
      cta: { label: "See analytics", href: "/client/analytics" },
    });
  }

  // Fallback if nothing surfaced
  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      icon: CheckCircle2,
      tone: "good",
      title: "Books look healthy",
      body: "No anomalies, overdue invoices, or major spending changes detected. Your accountant will surface anything that needs attention.",
    });
  }

  return insights.slice(0, 5);
}

export async function InsightsFeed({ userId }: { userId: string }) {
  const insights = await computeInsights(userId);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> insights / live
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">{insights.length} signal{insights.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins) => {
          const style = toneStyles[ins.tone];
          return (
            <div key={ins.id} className={`rounded-lg border p-4 ${style.ring}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${style.iconBg}`}>
                  <ins.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ins.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.body}</p>
                  {ins.cta && (
                    <a
                      href={ins.cta.href}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-mono text-emerald-500 hover:text-emerald-400"
                    >
                      → {ins.cta.label}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
