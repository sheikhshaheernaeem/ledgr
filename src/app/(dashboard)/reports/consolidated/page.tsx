import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ConsolidatedReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(sp.year ?? String(currentYear), 10);

  // Get all reports for selected year
  const reports = await prisma.report.findMany({
    where: { userId, year: selectedYear },
    orderBy: { month: "asc" },
  });

  // Build a month-indexed map
  const byMonth: Record<number, (typeof reports)[0] | null> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = null;
  for (const r of reports) byMonth[r.month] = r;

  // YTD totals (up to current month if current year, else full year)
  const upToMonth = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
  let ytdIncome = 0, ytdExpenses = 0, ytdProfit = 0;
  for (let m = 1; m <= upToMonth; m++) {
    const r = byMonth[m];
    if (r) { ytdIncome += r.totalIncome; ytdExpenses += r.totalExpenses; ytdProfit += r.netProfit; }
  }

  // Available years
  const yearRows = await prisma.report.groupBy({ by: ["year"], where: { userId }, orderBy: { year: "desc" } });
  const availableYears = [...new Set([currentYear, ...yearRows.map(r => r.year)])].sort((a, b) => b - a);

  // Best and worst months
  const existingReports = reports.filter(r => r.totalIncome > 0 || r.totalExpenses > 0);
  const bestMonth = existingReports.length ? existingReports.reduce((a, b) => b.netProfit > a.netProfit ? b : a) : null;
  const worstMonth = existingReports.length ? existingReports.reduce((a, b) => b.netProfit < a.netProfit ? b : a) : null;

  // Quarter totals
  const quarters = [
    { label: "Q1", months: [1, 2, 3] },
    { label: "Q2", months: [4, 5, 6] },
    { label: "Q3", months: [7, 8, 9] },
    { label: "Q4", months: [10, 11, 12] },
  ].map(q => {
    let income = 0, expenses = 0, profit = 0, hasData = false;
    for (const m of q.months) {
      const r = byMonth[m];
      if (r) { income += r.totalIncome; expenses += r.totalExpenses; profit += r.netProfit; hasData = true; }
    }
    return { ...q, income, expenses, profit, hasData };
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Reports
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Consolidated P&L</h1>
          <p className="text-muted-foreground mt-1">Year-to-date and quarterly breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          {availableYears.map(y => (
            <Link key={y} href={`/reports/consolidated?year=${y}`}>
              <Button
                variant={y === selectedYear ? "default" : "outline"}
                size="sm"
                className={y === selectedYear ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold" : ""}
              >
                {y}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* YTD Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: selectedYear === currentYear ? "YTD Revenue" : `${selectedYear} Revenue`, value: ytdIncome, color: "text-emerald-400", icon: TrendingUp, iconColor: "text-emerald-400" },
          { label: selectedYear === currentYear ? "YTD Expenses" : `${selectedYear} Expenses`, value: ytdExpenses, color: "text-red-400", icon: TrendingDown, iconColor: "text-red-400" },
          { label: selectedYear === currentYear ? "YTD Net Profit" : `${selectedYear} Net Profit`, value: ytdProfit, color: ytdProfit >= 0 ? "text-emerald-400" : "text-red-400", icon: ytdProfit >= 0 ? TrendingUp : TrendingDown, iconColor: ytdProfit >= 0 ? "text-emerald-400" : "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{fmtFull(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quarterly summary */}
      <div className="grid grid-cols-4 gap-3">
        {quarters.map(q => (
          <Card key={q.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{q.label} {selectedYear}</p>
              {q.hasData ? (
                <>
                  <p className="text-sm text-emerald-400 font-medium">{fmt(q.income)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
                  <div className="border-t border-border/40 mt-2 pt-2">
                    <p className={`text-sm font-bold ${q.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {q.profit >= 0 ? "+" : ""}{fmt(q.profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">Net</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">No data</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Highlights */}
      {(bestMonth || worstMonth) && (
        <div className="grid grid-cols-2 gap-4">
          {bestMonth && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Best Month</p>
                <p className="font-bold text-foreground">{MONTHS[bestMonth.month - 1]} {selectedYear}</p>
                <p className="text-emerald-400 font-semibold">{fmtFull(bestMonth.netProfit)} net profit</p>
              </CardContent>
            </Card>
          )}
          {worstMonth && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Worst Month</p>
                <p className="font-bold text-foreground">{MONTHS[worstMonth.month - 1]} {selectedYear}</p>
                <p className="text-red-400 font-semibold">{fmtFull(worstMonth.netProfit)} net profit</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Monthly table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">Month</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">Expenses</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">Net Profit</th>
                  <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const r = byMonth[month];
                  const isPast = selectedYear < currentYear || (selectedYear === currentYear && month <= new Date().getMonth() + 1);
                  return (
                    <tr key={month} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium text-foreground">
                        {MONTHS[month - 1]} {selectedYear}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {r ? fmt(r.totalIncome) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {r ? fmt(r.totalExpenses) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${r ? (r.netProfit >= 0 ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
                        {r ? `${r.netProfit >= 0 ? "+" : ""}${fmt(r.netProfit)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r ? (
                          <Badge variant="outline" className={`text-xs ${
                            r.status === "REVIEWED" ? "border-blue-500/30 text-blue-400" :
                            r.status === "SENT" ? "border-emerald-500/30 text-emerald-400" :
                            "border-yellow-500/30 text-yellow-400"
                          }`}>
                            {r.clientApprovedAt ? "Approved" : r.status.toLowerCase()}
                          </Badge>
                        ) : isPast ? (
                          <span className="text-xs text-muted-foreground">not generated</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">upcoming</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r && (
                          <Link href={`/reports/${r.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                              View
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="px-6 py-3 font-bold text-foreground uppercase text-xs tracking-wide">
                    {selectedYear === currentYear ? "YTD Total" : `${selectedYear} Total`}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{fmt(ytdIncome)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-400">{fmt(ytdExpenses)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${ytdProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {ytdProfit >= 0 ? "+" : ""}{fmt(ytdProfit)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
