import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, AlertTriangle } from "lucide-react";

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
    select: { amount: true, type: true, taxCategory: true },
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

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Summary</h1>
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

              <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-white text-sm">
                <span>Total Expenses</span>
                <span>{fmt(totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
