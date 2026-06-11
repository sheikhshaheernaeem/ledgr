import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Wallet, TrendingUp, AlertTriangle, Calendar, Receipt, FileText, Banknote } from "lucide-react";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ClientFinancialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, defaultTaxRate: true, taxName: true, name: true, companyName: true },
  });
  const currency = user?.currency ?? "USD";
  const taxRate = user?.defaultTaxRate ?? 0.25; // assume 25% if not set

  // Date ranges
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1);
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);

  const [bankAccounts, openInvoices, openBills, ytdTransactions, last3MonthTransactions, last90Statements] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId }, select: { name: true, accountType: true, currentBalance: true, currency: true } }),
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "OVERDUE"] } },
      select: { id: true, total: true, dueDate: true, issueDate: true, clientName: true, status: true, paidAt: true },
    }),
    prisma.bill.findMany({
      where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
      select: { id: true, total: true, amountPaid: true, dueDate: true, vendorName: true, status: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: ytdStart } },
      select: { type: true, amount: true, category: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: threeMonthsAgo } },
      select: { type: true, amount: true, category: true, date: true },
    }),
    prisma.statement.findMany({
      where: { userId, createdAt: { gte: yearAgo } },
      select: { rowCount: true, status: true, createdAt: true },
    }),
  ]);

  // Cash on hand
  const cashOnHand = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);

  // Accounts Receivable (open invoices)
  const accountsReceivable = openInvoices.reduce((s, i) => s + i.total, 0);

  // Accounts Payable (open bills, net of payments)
  const accountsPayable = openBills.reduce((s, b) => s + Math.max(0, b.total - b.amountPaid), 0);

  // YTD revenue/expenses
  const ytdRevenue = ytdTransactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const ytdExpenses = ytdTransactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const ytdNetProfit = ytdRevenue - ytdExpenses;

  // 3-month avg burn (expenses)
  const last3Expenses = last3MonthTransactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const last3Revenue = last3MonthTransactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const monthlyBurn = (last3Expenses - last3Revenue) / 3; // negative means profitable
  const monthlyAvgExpense = last3Expenses / 3;
  const monthlyAvgRevenue = last3Revenue / 3;

  // Runway
  const runwayMonths = monthlyBurn > 0 ? cashOnHand / monthlyBurn : Infinity;

  // Tax liability estimate
  const taxLiability = Math.max(0, ytdNetProfit * taxRate);

  // AR aging buckets
  const arBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  for (const inv of openInvoices) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) arBuckets.current += inv.total;
    else if (daysOverdue <= 30) arBuckets.d1_30 += inv.total;
    else if (daysOverdue <= 60) arBuckets.d31_60 += inv.total;
    else if (daysOverdue <= 90) arBuckets.d61_90 += inv.total;
    else arBuckets.d90_plus += inv.total;
  }

  // AP aging buckets
  const apBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  for (const b of openBills) {
    const owed = Math.max(0, b.total - b.amountPaid);
    const daysOverdue = Math.floor((now.getTime() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) apBuckets.current += owed;
    else if (daysOverdue <= 30) apBuckets.d1_30 += owed;
    else if (daysOverdue <= 60) apBuckets.d31_60 += owed;
    else if (daysOverdue <= 90) apBuckets.d61_90 += owed;
    else apBuckets.d90_plus += owed;
  }

  // Cash flow statement (last 3 months)
  // Operating = revenue - expenses (excluding asset/financing items)
  const operatingActivities = last3Revenue - last3Expenses;
  // Investing = expenses categorized as Equipment, Repairs etc (rough)
  const investingCats = new Set(["Equipment", "Repairs", "Asset Purchase"]);
  const investingActivities = -last3MonthTransactions
    .filter((t) => t.type === "DEBIT" && t.category && investingCats.has(t.category))
    .reduce((s, t) => s + t.amount, 0);
  // Financing = Loans, Interest (placeholder)
  const financingCats = new Set(["Interest", "Loan", "Owner Draw"]);
  const financingActivities = -last3MonthTransactions
    .filter((t) => t.type === "DEBIT" && t.category && financingCats.has(t.category))
    .reduce((s, t) => s + t.amount, 0);
  const netCashChange = operatingActivities + investingActivities + financingActivities;

  // Total assets / liabilities / equity
  const totalAssets = cashOnHand + accountsReceivable;
  const totalLiabilities = accountsPayable + taxLiability;
  const equity = totalAssets - totalLiabilities;

  // Activity score
  const activityLast90 = last90Statements.reduce((s, st) => s + st.rowCount, 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> financials / live
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Your numbers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full financial picture, updated from your latest categorized transactions. Reviewed by your accountant before month-end close.
        </p>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Kpi label="cash_on_hand" value={fmt(cashOnHand, currency)} icon={Wallet} color="text-emerald-400" />
        <Kpi
          label="runway"
          value={Number.isFinite(runwayMonths) ? `${runwayMonths.toFixed(1)} mo` : "∞"}
          icon={Calendar}
          color={!Number.isFinite(runwayMonths) ? "text-emerald-400" : runwayMonths > 12 ? "text-emerald-400" : runwayMonths > 6 ? "text-amber-400" : "text-rose-400"}
          sub={monthlyBurn > 0 ? `${fmt(monthlyBurn, currency)}/mo burn` : "profitable"}
        />
        <Kpi
          label="ytd_net_profit"
          value={fmt(ytdNetProfit, currency)}
          icon={TrendingUp}
          color={ytdNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}
          sub={`rev: ${fmt(ytdRevenue, currency)} · exp: ${fmt(ytdExpenses, currency)}`}
        />
        <Kpi
          label="tax_liability_est"
          value={fmt(taxLiability, currency)}
          icon={Receipt}
          color="text-amber-400"
          sub={`at ${(taxRate * 100).toFixed(0)}% ${user?.taxName ?? "tax rate"}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Balance Sheet */}
        <Section title="balance_sheet" subtitle="snapshot as of today">
          <Row label="cash" value={fmtD(cashOnHand, currency)} indent={1} />
          <Row label="accounts_receivable" value={fmtD(accountsReceivable, currency)} indent={1} />
          <Row label="total_assets" value={fmtD(totalAssets, currency)} bold />
          <Divider />
          <Row label="accounts_payable" value={fmtD(accountsPayable, currency)} indent={1} />
          <Row label="estimated_tax_payable" value={fmtD(taxLiability, currency)} indent={1} />
          <Row label="total_liabilities" value={fmtD(totalLiabilities, currency)} bold />
          <Divider />
          <Row label="owner_equity" value={fmtD(equity, currency)} bold color={equity >= 0 ? "text-emerald-400" : "text-rose-400"} />
        </Section>

        {/* Cash Flow Statement */}
        <Section title="cash_flow_statement" subtitle="last 3 months">
          <Row label="cash_from_operations" value={fmtD(operatingActivities, currency)} color={operatingActivities >= 0 ? "text-emerald-400" : "text-rose-400"} />
          <p className="px-4 text-[10px] text-muted-foreground font-mono mb-2">avg monthly: rev {fmt(monthlyAvgRevenue, currency)} − exp {fmt(monthlyAvgExpense, currency)}</p>
          <Row label="cash_from_investing" value={fmtD(investingActivities, currency)} color={investingActivities >= 0 ? "text-emerald-400" : "text-rose-400"} />
          <Row label="cash_from_financing" value={fmtD(financingActivities, currency)} color={financingActivities >= 0 ? "text-emerald-400" : "text-rose-400"} />
          <Divider />
          <Row label="net_change_in_cash" value={fmtD(netCashChange, currency)} bold color={netCashChange >= 0 ? "text-emerald-400" : "text-rose-400"} />
        </Section>

        {/* AR Aging */}
        <Section title="accounts_receivable_aging" subtitle={`${openInvoices.length} open invoices · total ${fmt(accountsReceivable, currency)}`}>
          <ArApRow label="current" amount={arBuckets.current} total={accountsReceivable} currency={currency} />
          <ArApRow label="1-30_days_overdue" amount={arBuckets.d1_30} total={accountsReceivable} currency={currency} accent="text-amber-400" />
          <ArApRow label="31-60_days_overdue" amount={arBuckets.d31_60} total={accountsReceivable} currency={currency} accent="text-amber-400" />
          <ArApRow label="61-90_days_overdue" amount={arBuckets.d61_90} total={accountsReceivable} currency={currency} accent="text-rose-400" />
          <ArApRow label="90+_days_overdue" amount={arBuckets.d90_plus} total={accountsReceivable} currency={currency} accent="text-rose-400" />
        </Section>

        {/* AP Aging */}
        <Section title="accounts_payable_aging" subtitle={`${openBills.length} open bills · total ${fmt(accountsPayable, currency)}`}>
          <ArApRow label="current" amount={apBuckets.current} total={accountsPayable} currency={currency} />
          <ArApRow label="1-30_days_overdue" amount={apBuckets.d1_30} total={accountsPayable} currency={currency} accent="text-amber-400" />
          <ArApRow label="31-60_days_overdue" amount={apBuckets.d31_60} total={accountsPayable} currency={currency} accent="text-amber-400" />
          <ArApRow label="61-90_days_overdue" amount={apBuckets.d61_90} total={accountsPayable} currency={currency} accent="text-rose-400" />
          <ArApRow label="90+_days_overdue" amount={apBuckets.d90_plus} total={accountsPayable} currency={currency} accent="text-rose-400" />
        </Section>
      </div>

      {/* Bank accounts */}
      {bankAccounts.length > 0 && (
        <Section title="bank_accounts" subtitle={`${bankAccounts.length} account${bankAccounts.length > 1 ? "s" : ""}`}>
          <div className="px-4 pb-4 space-y-2">
            {bankAccounts.map((a, i) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="text-foreground">{a.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{a.accountType.toLowerCase()}</p>
                </div>
                <p className="font-mono font-semibold text-emerald-400">{fmtD(a.currentBalance, a.currency)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Runway commentary */}
      <div className="rounded-lg border border-border/60 bg-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">runway_analysis</p>
            <p className="text-sm text-foreground leading-relaxed">
              {monthlyBurn <= 0 ? (
                <>You&apos;re cash-flow positive. Operating cash inflow exceeds outflow, so your runway is effectively unlimited at the current rate.</>
              ) : runwayMonths > 18 ? (
                <>You have <span className="font-semibold text-emerald-400">{runwayMonths.toFixed(1)} months</span> of runway at the current burn rate of <span className="font-mono">{fmt(monthlyBurn, currency)}/mo</span>. Healthy reserves — focus on growth.</>
              ) : runwayMonths > 9 ? (
                <>You have <span className="font-semibold text-amber-400">{runwayMonths.toFixed(1)} months</span> of runway. Burn rate is <span className="font-mono">{fmt(monthlyBurn, currency)}/mo</span>. Consider extending reserves or accelerating revenue.</>
              ) : (
                <>You have <span className="font-semibold text-rose-400">{runwayMonths.toFixed(1)} months</span> of runway at <span className="font-mono">{fmt(monthlyBurn, currency)}/mo</span> burn. Action required: raise, cut, or boost revenue. <span className="text-emerald-400">Message your accountant.</span></>
              )}
            </p>
            {activityLast90 > 0 && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">Based on {activityLast90.toLocaleString()} categorized transactions over the past 90 days.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── components ── */

function Kpi({
  label, value, icon: Icon, color = "text-foreground", sub,
}: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
  color?: string; sub?: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
        {subtitle && <p className="font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function Row({ label, value, bold = false, color = "text-foreground", indent = 0 }: { label: string; value: string; bold?: boolean; color?: string; indent?: number }) {
  return (
    <div className={`px-4 py-1.5 flex justify-between items-center text-sm`}>
      <span className={`font-mono ${bold ? "text-foreground font-semibold" : "text-muted-foreground"}`} style={{ paddingLeft: `${indent * 12}px` }}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${color}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-border/60" />;
}

function ArApRow({ label, amount, total, currency, accent }: { label: string; amount: number; total: number; currency: string; accent?: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="px-4 py-2">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className={`font-mono text-xs ${accent ?? "text-muted-foreground"}`}>{label}</span>
        <span className={`font-mono ${accent ?? "text-foreground"}`}>{fmtD(amount, currency)}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${accent?.includes("rose") ? "bg-rose-500" : accent?.includes("amber") ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
