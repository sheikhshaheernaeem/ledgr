import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { MonthlyBarChart, CategoryBarChart } from "./AnalyticsCharts";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

export default async function ClientAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as { role?: string }).role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true, amount: true, type: true, category: true },
  });

  const totalIncome = transactions.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  // Group by month for bar chart
  const monthMap: Record<string, { income: number; expenses: number }> = {};
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
    if (tx.type === "CREDIT") monthMap[key].income += tx.amount;
    else monthMap[key].expenses += tx.amount;
  });

  const monthlyData = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({
      month: new Date(key + "-01").toLocaleString("en-US", { month: "short", year: "2-digit" }),
      income: Math.round(v.income),
      expenses: Math.round(v.expenses),
      net: Math.round(v.income - v.expenses),
    }));

  // Category breakdown for expenses
  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === "DEBIT").forEach(t => {
    const cat = t.category ?? "Other";
    catMap[cat] = (catMap[cat] ?? 0) + t.amount;
  });
  const categoryData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Visual breakdown of your business finances</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit</p>
              <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-emerald-400" : "text-red-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(Math.abs(net))}</p>
            <p className="text-xs text-muted-foreground">{net >= 0 ? "profit" : "loss"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue vs expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Monthly Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart data={monthlyData} />
        </CardContent>
      </Card>

      {/* Expense by category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={categoryData} />
        </CardContent>
      </Card>

      {/* Category table */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryData.map(({ category, amount }) => (
              <div key={category} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-40 truncate shrink-0">{category}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-24 text-right shrink-0">{fmt(amount)}</span>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                  {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
