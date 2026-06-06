import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, AlertTriangle, CalendarClock } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const DEDUCTIBLE_CATEGORIES = new Set([
  "Operating Expense",
  "Capital Expense",
  "Cost of Goods",
  "Payroll Tax",
]);

const YEAR_RANGE = (() => {
  const cur = new Date().getFullYear();
  return [cur - 2, cur - 1, cur];
})();

export default async function TaxSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? String(new Date().getFullYear()));

  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      status: "APPROVED",
      date: { gte: startDate, lte: endDate },
    },
    select: { amount: true, type: true, taxCategory: true, date: true },
  });

  // Only expenses are relevant for tax deductions
  const expenses = transactions.filter((t) => t.type === "DEBIT");

  // Group by taxCategory
  const grouped: Record<string, { total: number; count: number }> = {};
  for (const t of expenses) {
    const cat = t.taxCategory ?? "Unclassified";
    if (!grouped[cat]) grouped[cat] = { total: 0, count: 0 };
    grouped[cat].total += t.amount;
    grouped[cat].count += 1;
  }

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + t.amount, 0);

  // Deductible vs non-deductible
  let totalDeductible = 0;
  let totalNonDeductible = 0;
  for (const [cat, data] of Object.entries(grouped)) {
    if (DEDUCTIBLE_CATEGORIES.has(cat)) {
      totalDeductible += data.total;
    } else if (cat !== "Unclassified") {
      totalNonDeductible += data.total;
    }
  }
  const estimatedTaxSavings = totalDeductible * 0.3;

  const catRows = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  // ── Quarterly Estimated Tax ─────────────────────────────────────────────────
  function getQuarter(date: Date): 1 | 2 | 3 | 4 {
    const m = date.getMonth(); // 0-based
    if (m <= 2) return 1;
    if (m <= 5) return 2;
    if (m <= 8) return 3;
    return 4;
  }

  function calcSETax(netProfit: number): number {
    if (netProfit <= 0) return 0;
    return netProfit * 0.9235 * 0.153;
  }

  function calcIncomeTax(netProfit: number): number {
    if (netProfit <= 0) return 0;
    // 2024 standard deduction applied implicitly via brackets starting at 0
    // Simplified single-filer brackets (2024):
    // 10% on $0–$11,600, 12% on $11,601–$47,150, 22% on $47,151–$100,525
    let tax = 0;
    const b1 = 11600, b2 = 47150, b3 = 100525;
    if (netProfit <= b1) {
      tax = netProfit * 0.10;
    } else if (netProfit <= b2) {
      tax = b1 * 0.10 + (netProfit - b1) * 0.12;
    } else if (netProfit <= b3) {
      tax = b1 * 0.10 + (b2 - b1) * 0.12 + (netProfit - b2) * 0.22;
    } else {
      tax = b1 * 0.10 + (b2 - b1) * 0.12 + (b3 - b2) * 0.22 + (netProfit - b3) * 0.24;
    }
    return tax;
  }

  const quarters: Record<1 | 2 | 3 | 4, { income: number; expenses: number }> = {
    1: { income: 0, expenses: 0 },
    2: { income: 0, expenses: 0 },
    3: { income: 0, expenses: 0 },
    4: { income: 0, expenses: 0 },
  };

  for (const t of transactions) {
    const q = getQuarter(new Date(t.date));
    if (t.type === "CREDIT") quarters[q].income += t.amount;
    else quarters[q].expenses += t.amount;
  }

  // Annual totals for annualised tax estimate
  const annualIncome = (quarters[1].income + quarters[2].income + quarters[3].income + quarters[4].income);
  const annualExpensesAll = (quarters[1].expenses + quarters[2].expenses + quarters[3].expenses + quarters[4].expenses);
  const annualNetProfit = annualIncome - annualExpensesAll;
  const annualSE = calcSETax(annualNetProfit);
  const annualIT = calcIncomeTax(annualNetProfit);
  const annualTotalTax = annualSE + annualIT;
  const quarterlyPaymentDue = annualTotalTax / 4;

  const today = new Date();

  const quarterMeta = [
    { q: 1 as const, label: "Q1", period: "Jan – Mar", dueDate: new Date(year, 3, 15), dueDateLabel: `Apr 15, ${year}` },
    { q: 2 as const, label: "Q2", period: "Apr – Jun", dueDate: new Date(year, 5, 17), dueDateLabel: `Jun 17, ${year}` },
    { q: 3 as const, label: "Q3", period: "Jul – Sep", dueDate: new Date(year, 8, 16), dueDateLabel: `Sep 16, ${year}` },
    { q: 4 as const, label: "Q4", period: "Oct – Dec", dueDate: new Date(year + 1, 0, 15), dueDateLabel: `Jan 15, ${year + 1}` },
  ];

  function getQBadge(dueDate: Date): { label: string; cls: string } {
    const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return { label: "Due", cls: "border-red-500/40 text-red-400 bg-red-500/5" };
    if (diffDays <= 30) return { label: "Upcoming", cls: "border-yellow-500/40 text-yellow-400 bg-yellow-500/5" };
    return { label: "Paid", cls: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5" };
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tax Summary</h1>
          <p className="text-muted-foreground mt-1">
            Expense breakdown by tax category for {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1">
            {YEAR_RANGE.map((y) => (
              <Link key={y} href={`/tax-summary?year=${y}`}>
                <Button
                  variant={y === year ? "default" : "outline"}
                  size="sm"
                  className={
                    y === year
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                      : ""
                  }
                >
                  {y}
                </Button>
              </Link>
            ))}
          </div>
          <Link href={`/api/transactions/export?taxCategory=all&year=${year}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/80">
            Consult your accountant before filing. These figures are for estimation only.
          </p>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Deductible
            </p>
            <p className="text-2xl font-bold text-emerald-400">{fmt(totalDeductible)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalExpenses > 0
                ? `${((totalDeductible / totalExpenses) * 100).toFixed(0)}% of expenses`
                : "No expenses"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Non-Deductible
            </p>
            <p className="text-2xl font-bold text-red-400">{fmt(totalNonDeductible)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalExpenses > 0
                ? `${((totalNonDeductible / totalExpenses) * 100).toFixed(0)}% of expenses`
                : "No expenses"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Est. Tax Savings (30%)
            </p>
            <p className="text-2xl font-bold text-emerald-400">{fmt(estimatedTaxSavings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Based on deductible expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Income reference */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
        <span>
          Total Income:{" "}
          <span className="text-emerald-400 font-medium">{fmt(totalIncome)}</span>
        </span>
        <span>·</span>
        <span>
          Total Expenses:{" "}
          <span className="text-red-400 font-medium">{fmt(totalExpenses)}</span>
        </span>
      </div>

      {/* Per-category breakdown */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Breakdown by Tax Category</CardTitle>
        </CardHeader>
        <CardContent>
          {catRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No approved expense transactions for {year}</p>
              <p className="text-xs mt-1">Upload and approve transactions to see your tax summary</p>
            </div>
          ) : (
            <div className="space-y-3">
              {catRows.map(([cat, data]) => {
                const pct = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
                const isDeductible = DEDUCTIBLE_CATEGORIES.has(cat);
                const isUnclassified = cat === "Unclassified";
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{cat}</span>
                        {!isUnclassified && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isDeductible
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }`}
                          >
                            {isDeductible ? "Deductible" : "Non-deductible"}
                          </Badge>
                        )}
                        {isUnclassified && (
                          <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                            Needs review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="text-xs text-muted-foreground">
                          {data.count} txn{data.count !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="font-medium text-foreground w-28 text-right">
                          {fmt(data.total)}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDeductible
                            ? "bg-emerald-500/60"
                            : isUnclassified
                            ? "bg-yellow-500/60"
                            : "bg-red-500/60"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-foreground text-sm">
                <span>Total Expenses</span>
                <span>{fmt(totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quarterly Estimated Tax ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold text-foreground">
            Quarterly Estimated Tax ({year})
          </h2>
        </div>

        {/* Annual summary row */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground px-1">
          <span>
            Annual net profit:{" "}
            <span className={annualNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 dark:text-red-400 font-medium"}>
              {fmt(annualNetProfit)}
            </span>
          </span>
          <span>·</span>
          <span>
            Est. annual tax:{" "}
            <span className="text-foreground font-medium">{fmt(annualTotalTax)}</span>
          </span>
          <span>·</span>
          <span>
            Quarterly payment:{" "}
            <span className="text-foreground font-medium">{fmt(quarterlyPaymentDue)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {quarterMeta.map(({ q, label, period, dueDate, dueDateLabel }) => {
            const qData = quarters[q];
            const qNet = qData.income - qData.expenses;
            const badge = getQBadge(dueDate);
            return (
              <Card key={q} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {label} <span className="text-muted-foreground font-normal">· {period}</span>
                    </CardTitle>
                    <Badge variant="outline" className={`text-xs ${badge.cls}`}>
                      {badge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmt(qData.income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expenses</span>
                      <span className="text-red-500 dark:text-red-400 font-medium">{fmt(qData.expenses)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="text-muted-foreground font-medium">Net Profit</span>
                      <span className={`font-semibold ${qNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {fmt(qNet)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Quarterly Payment</p>
                    <p className="text-xl font-bold text-foreground">{fmt(quarterlyPaymentDue)}</p>
                    <p className="text-xs text-muted-foreground">Due {dueDateLabel}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3 px-1">
          * SE tax (15.3% on 92.35% of net profit) + progressive federal income tax using 2024 single-filer brackets. Consult a tax professional before making payments.
        </p>
      </div>
    </div>
  );
}
