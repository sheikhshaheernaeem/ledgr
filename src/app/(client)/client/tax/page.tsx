import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Receipt, AlertTriangle, Calendar, TrendingDown, FileCheck, DollarSign,
} from "lucide-react";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Common US deductible categories (works as a sensible default globally)
const DEDUCTIBLE_CATEGORIES = new Set([
  "Software & SaaS", "Marketing", "Advertising", "Travel", "Meals",
  "Office Supplies", "Insurance", "Legal & Professional", "Equipment",
  "Repairs", "Contractors", "Rent", "Utilities", "Bank Fees", "Interest",
]);

const NON_DEDUCTIBLE = new Set([
  "Owner Draw", "Personal", "Dividends",
]);

// Quarterly tax estimate deadlines (US — generic)
const QUARTERLY_DEADLINES = [
  { quarter: "Q1", label: "Apr 15", monthEnd: 3 },
  { quarter: "Q2", label: "Jun 15", monthEnd: 6 },
  { quarter: "Q3", label: "Sep 15", monthEnd: 9 },
  { quarter: "Q4", label: "Jan 15 (next yr)", monthEnd: 12 },
];

export default async function ClientTaxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, defaultTaxRate: true, taxName: true, country: true },
  });
  const currency = user?.currency ?? "USD";
  const taxRate = user?.defaultTaxRate ?? 0.25;
  const taxName = user?.taxName ?? "income tax";

  const ytdTxns = await prisma.transaction.findMany({
    where: { userId, date: { gte: ytdStart } },
    select: { type: true, amount: true, category: true, taxCategory: true, date: true, description: true },
  });

  const revenue = ytdTxns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);

  // Deductible expenses
  const deductibleByCategory: Record<string, { amount: number; count: number }> = {};
  let totalDeductible = 0;
  let totalNonDeductible = 0;
  let unclassified = 0;

  for (const t of ytdTxns) {
    if (t.type !== "DEBIT") continue;
    const cat = t.category ?? "Uncategorized";
    if (DEDUCTIBLE_CATEGORIES.has(cat) || t.taxCategory) {
      deductibleByCategory[cat] = deductibleByCategory[cat] ?? { amount: 0, count: 0 };
      deductibleByCategory[cat].amount += t.amount;
      deductibleByCategory[cat].count += 1;
      totalDeductible += t.amount;
    } else if (NON_DEDUCTIBLE.has(cat)) {
      totalNonDeductible += t.amount;
    } else if (cat === "Uncategorized") {
      unclassified += t.amount;
    }
  }

  const deductibleList = Object.entries(deductibleByCategory)
    .map(([category, { amount, count }]) => ({ category, amount, count }))
    .sort((a, b) => b.amount - a.amount);

  // Taxable income & estimated tax owed
  const taxableIncome = Math.max(0, revenue - totalDeductible);
  const estimatedTaxOwed = taxableIncome * taxRate;

  // Effective tax rate (vs total revenue)
  const effectiveRate = revenue > 0 ? (estimatedTaxOwed / revenue) * 100 : 0;

  // Quarterly payments — split estimated tax across remaining quarters
  const currentMonth = now.getMonth() + 1;
  const quarters = QUARTERLY_DEADLINES.map((q) => {
    const isPast = currentMonth > q.monthEnd;
    const isCurrent = currentMonth <= q.monthEnd && (currentMonth > q.monthEnd - 3 || q.quarter === "Q1");
    return {
      ...q,
      isPast,
      isCurrent,
      estimatedPayment: estimatedTaxOwed / 4,
    };
  });

  // Per-quarter income/expenses for trend
  const quarterlyData = [1, 2, 3, 4].map((q) => {
    const qStart = new Date(now.getFullYear(), (q - 1) * 3, 1);
    const qEnd = new Date(now.getFullYear(), q * 3, 0);
    const txns = ytdTxns.filter((t) => t.date >= qStart && t.date <= qEnd);
    const rev = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    return { quarter: `Q${q}`, revenue: rev, expenses: exp, profit: rev - exp };
  });

  // Largest deductible vendors (top 5)
  const vendorMap: Record<string, number> = {};
  for (const t of ytdTxns) {
    if (t.type !== "DEBIT") continue;
    if (!t.category || !DEDUCTIBLE_CATEGORIES.has(t.category)) continue;
    const key = t.description.slice(0, 40);
    vendorMap[key] = (vendorMap[key] ?? 0) + t.amount;
  }
  const topVendors = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Receipt className="h-3 w-3" /> tax / year_{now.getFullYear()}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Tax dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live estimate of your {taxName} liability, deductions tracked, quarterly payments. Your accountant reviews and adjusts before filing.
        </p>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Kpi label="ytd_revenue" value={fmt(revenue, currency)} color="text-emerald-400" icon={DollarSign} />
        <Kpi label="ytd_deductions" value={fmt(totalDeductible, currency)} color="text-emerald-400" icon={TrendingDown} sub={`${deductibleList.length} categories`} />
        <Kpi label="taxable_income" value={fmt(taxableIncome, currency)} icon={FileCheck} sub={`revenue − deductions`} />
        <Kpi
          label="estimated_tax_owed"
          value={fmt(estimatedTaxOwed, currency)}
          color="text-amber-400"
          icon={Receipt}
          sub={`at ${(taxRate * 100).toFixed(0)}% · effective ${effectiveRate.toFixed(1)}%`}
        />
      </div>

      {/* Quarterly payment schedule */}
      <Section title="quarterly_estimated_payments" subtitle={`${fmt(estimatedTaxOwed / 4, currency)} per quarter`}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-border/60">
          {quarters.map((q) => (
            <div key={q.quarter} className={`bg-card p-4 ${q.isCurrent ? "ring-1 ring-emerald-500/30" : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{q.quarter.toLowerCase()}_due</p>
                {q.isPast && (
                  <span className="font-mono text-[9px] uppercase text-muted-foreground border border-border bg-card/60 px-1.5 py-0.5 rounded">paid</span>
                )}
                {q.isCurrent && !q.isPast && (
                  <span className="font-mono text-[9px] uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">due_soon</span>
                )}
              </div>
              <p className="font-semibold text-foreground text-lg">{fmt(q.estimatedPayment, currency)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3 inline mr-1" />by {q.label}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deductible expenses by category */}
        <Section title="deductible_expenses_by_category" subtitle={`${fmt(totalDeductible, currency)} total`}>
          {deductibleList.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No deductible expenses yet this year.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {deductibleList.map(({ category, amount, count }) => {
                const pct = totalDeductible > 0 ? (amount / totalDeductible) * 100 : 0;
                return (
                  <li key={category} className="px-4 py-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-foreground">{category}</span>
                      <span className="font-mono text-sm text-emerald-400">{fmtD(amount, currency)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {count} txn{count > 1 ? "s" : ""} · {pct.toFixed(1)}% of deductions
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Quarterly trend */}
        <Section title="quarterly_p&l_trend" subtitle={`${now.getFullYear()} YTD`}>
          <ul className="divide-y divide-border/40">
            {quarterlyData.map((q) => (
              <li key={q.quarter} className="px-4 py-3 flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-8">{q.quarter.toLowerCase()}</span>
                <div className="flex-1 grid grid-cols-3 gap-2 text-xs font-mono">
                  <span className="text-emerald-400">+{fmt(q.revenue, currency)}</span>
                  <span className="text-rose-400">−{fmt(q.expenses, currency)}</span>
                  <span className={`text-right ${q.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {q.profit >= 0 ? "+" : ""}{fmt(q.profit, currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Top deductible vendors */}
        {topVendors.length > 0 && (
          <Section title="top_deductible_vendors" subtitle="largest expenses you can write off">
            <ul className="divide-y divide-border/40">
              {topVendors.map((v) => (
                <li key={v.name} className="px-4 py-2.5 flex items-center justify-between">
                  <p className="text-sm text-foreground truncate flex-1 min-w-0">{v.name}</p>
                  <p className="font-mono text-sm text-emerald-400 shrink-0 ml-3">{fmtD(v.amount, currency)}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Warnings */}
        <Section title="things_to_address" subtitle="action items before filing">
          <ul className="divide-y divide-border/40">
            {unclassified > 0 && (
              <li className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{fmt(unclassified, currency)} uncategorized</p>
                  <p className="text-xs text-muted-foreground mt-0.5">May contain deductible expenses. Your accountant is reviewing.</p>
                </div>
              </li>
            )}
            {totalNonDeductible > 0 && (
              <li className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{fmt(totalNonDeductible, currency)} non-deductible</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Owner draws, personal expenses, dividends.</p>
                </div>
              </li>
            )}
            {unclassified === 0 && totalNonDeductible === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Books look tax-clean. ✓
              </li>
            )}
          </ul>
        </Section>
      </div>

      {/* Footnote */}
      <div className="rounded-lg border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">how_this_is_calculated</p>
        Tax owed = (revenue − deductible expenses) × your tax rate ({(taxRate * 100).toFixed(0)}%). This is an
        estimate based on commonly-deductible categories
        {user?.country ? ` for ${user.country}` : ""} — your accountant adjusts for jurisdiction-specific rules,
        depreciation schedules, and credits before filing.
      </div>
    </div>
  );
}

function Kpi({ label, value, color = "text-foreground", sub, icon: Icon }: {
  label: string; value: string; color?: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
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
      {children}
    </div>
  );
}
