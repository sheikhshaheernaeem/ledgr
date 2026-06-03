import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertTriangle } from "lucide-react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // 12-month window
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // 6-month window for avg monthly revenue
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [allApprovedTx, invoicesAll, openInvoices] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "APPROVED" },
      select: { amount: true, type: true, category: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: { clientName: true, total: true, amountPaid: true, status: true, issueDate: true, dueDate: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "OVERDUE"] } },
      select: { total: true, dueDate: true, status: true },
    }),
  ]);

  // ── Summary stats ───────────────────────────────────────────────────
  const totalRevenue = allApprovedTx.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = allApprovedTx.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

  // Avg monthly revenue — last 6 months
  const last6CreditTx = allApprovedTx.filter(
    t => t.type === "CREDIT" && new Date(t.date) >= sixMonthsAgo
  );
  const monthBuckets6: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets6[`${d.getFullYear()}-${d.getMonth()}`] = 0;
  }
  for (const t of last6CreditTx) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in monthBuckets6) monthBuckets6[key] += t.amount;
  }
  const avgMonthlyRevenue = Object.values(monthBuckets6).reduce((s, v) => s + v, 0) / 6;

  // Invoiced this year
  const invoicedThisYear = invoicesAll
    .filter(inv => new Date(inv.issueDate) >= yearStart)
    .reduce((s, inv) => s + inv.total, 0);

  // ── A. Expense breakdown by category ────────────────────────────────
  const debitTx = allApprovedTx.filter(t => t.type === "DEBIT");
  const categoryMap: Record<string, number> = {};
  for (const t of debitTx) {
    const cat = t.category ?? "Uncategorized";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + t.amount;
  }
  const categoryTotals = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1]);
  const expenseTotal = categoryTotals.reduce((s, [, v]) => s + v, 0);

  // ── B. Income vs Expenses — last 12 months ──────────────────────────
  interface MonthBar { label: string; year: number; month: number; income: number; expenses: number; }
  const monthlyMap: Record<string, MonthBar> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyMap[key] = { label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), income: 0, expenses: 0 };
  }
  for (const t of allApprovedTx) {
    const d = new Date(t.date);
    if (d < twelveMonthsAgo) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!(key in monthlyMap)) continue;
    if (t.type === "CREDIT") monthlyMap[key].income += t.amount;
    else monthlyMap[key].expenses += t.amount;
  }
  const monthlyData = Object.values(monthlyMap);

  // ── C. Top 5 clients by revenue ──────────────────────────────────────
  const clientMap: Record<string, number> = {};
  for (const inv of invoicesAll) {
    if (inv.status === "PAID" || inv.status === "SENT") {
      clientMap[inv.clientName] = (clientMap[inv.clientName] ?? 0) + inv.total;
    }
  }
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxClientRevenue = topClients[0]?.[1] ?? 1;

  // ── E. Client Revenue table ──────────────────────────────────────────
  interface ClientRevRow { name: string; totalInvoiced: number; totalPaid: number; outstanding: number; paymentRate: number; }
  const clientRevMap: Record<string, { invoiced: number; paid: number }> = {};
  for (const inv of invoicesAll) {
    if (!clientRevMap[inv.clientName]) clientRevMap[inv.clientName] = { invoiced: 0, paid: 0 };
    clientRevMap[inv.clientName].invoiced += inv.total;
    clientRevMap[inv.clientName].paid += inv.amountPaid ?? (inv.status === "PAID" ? inv.total : 0);
  }
  const clientRevRows: ClientRevRow[] = Object.entries(clientRevMap)
    .map(([name, v]) => ({
      name,
      totalInvoiced: v.invoiced,
      totalPaid: v.paid,
      outstanding: Math.max(0, v.invoiced - v.paid),
      paymentRate: v.invoiced > 0 ? Math.min(100, (v.paid / v.invoiced) * 100) : 0,
    }))
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
    .slice(0, 10);

  // ── D. AR Aging ───────────────────────────────────────────────────────
  const aging = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
  const agingCounts = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
  for (const inv of openInvoices) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000);
    if (daysOverdue <= 0) { aging.current += inv.total; agingCounts.current++; }
    else if (daysOverdue <= 30) { aging.d1_30 += inv.total; agingCounts.d1_30++; }
    else if (daysOverdue <= 60) { aging.d31_60 += inv.total; agingCounts.d31_60++; }
    else { aging.d60plus += inv.total; agingCounts.d60plus++; }
  }

  // ── Chart geometry for Income vs Expenses ───────────────────────────
  const maxMonthVal = Math.max(...monthlyData.flatMap(m => [m.income, m.expenses]), 1);
  const CH = 160;
  const barW = 18;
  const gap = 6;
  const groupW = barW * 2 + gap;
  const monthGap = 28;
  const totalSvgW = monthlyData.length * (groupW + monthGap);

  const summaryStats = [
    { label: "Total Revenue", value: `$${fmt(totalRevenue)}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Expenses", value: `$${fmt(totalExpenses)}`, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Avg Monthly Revenue", value: `$${fmt(avgMonthlyRevenue)}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10", sub: "last 6 months" },
    { label: "Invoiced This Year", value: `$${fmt(invoicedThisYear)}`, icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep-dive into your financials</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map(s => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              {"sub" in s && s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row: Expense Breakdown + AR Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* A. Expense Breakdown */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No approved expenses yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryTotals.map(([cat, amt]) => {
                  const pct = expenseTotal > 0 ? (amt / expenseTotal) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground truncate max-w-[160px]">{cat}</span>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-medium text-red-400">${fmt(amt)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <Separator className="my-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total</span>
                  <span className="font-medium text-red-400">${fmt(expenseTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* D. AR Aging */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              AR Aging
              {(aging.d1_30 + aging.d31_60 + aging.d60plus) > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Current", sublabel: "Not yet due", amount: aging.current, count: agingCounts.current, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { label: "1–30 Days", sublabel: "Overdue", amount: aging.d1_30, count: agingCounts.d1_30, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
                { label: "31–60 Days", sublabel: "Overdue", amount: aging.d31_60, count: agingCounts.d31_60, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                { label: "60+ Days", sublabel: "Overdue", amount: aging.d60plus, count: agingCounts.d60plus, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
              ].map(bucket => (
                <div key={bucket.label} className={`rounded-lg border ${bucket.border} ${bucket.bg} p-4`}>
                  <p className="text-xs text-muted-foreground">{bucket.label}</p>
                  <p className="text-xs text-muted-foreground opacity-70 mb-2">{bucket.sublabel}</p>
                  <p className={`text-lg font-bold ${bucket.color}`}>${fmt(bucket.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{bucket.count} invoice{bucket.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
            {openInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 mt-2">No open invoices.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* B. Income vs Expenses — last 12 months */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Income vs Expenses — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.every(m => m.income === 0 && m.expenses === 0) ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No approved transactions in the last 12 months.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> Income</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500" /> Expenses</div>
              </div>
              <div className="overflow-x-auto">
                <svg width={Math.max(totalSvgW, 500)} height={CH + 36} className="block">
                  {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = CH - pct * CH;
                    const label = pct === 0 ? "" : `$${((maxMonthVal * pct) / 1000).toFixed(0)}k`;
                    return (
                      <g key={pct}>
                        <line x1={0} y1={y} x2={totalSvgW} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
                        {label && <text x={2} y={y - 3} fill="currentColor" fillOpacity={0.4} fontSize={10}>{label}</text>}
                      </g>
                    );
                  })}
                  {monthlyData.map((m, i) => {
                    const x = i * (groupW + monthGap) + monthGap / 2;
                    const incH = Math.max(2, Math.round((m.income / maxMonthVal) * CH));
                    const expH = Math.max(2, Math.round((m.expenses / maxMonthVal) * CH));
                    const centerX = x + groupW / 2;
                    return (
                      <g key={`${m.year}-${m.month}`}>
                        <rect x={x} y={CH - incH} width={barW} height={incH} fill="#10b981" rx={3} opacity={0.85}>
                          <title>Income: ${fmt(m.income)}</title>
                        </rect>
                        <rect x={x + barW + gap} y={CH - expH} width={barW} height={expH} fill="#ef4444" rx={3} opacity={0.85}>
                          <title>Expenses: ${fmt(m.expenses)}</title>
                        </rect>
                        <text x={centerX} y={CH + 15} textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize={10}>
                          {m.label}
                        </text>
                        <text x={centerX} y={CH + 27} textAnchor="middle" fill="currentColor" fillOpacity={0.3} fontSize={8}>
                          {m.year}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* C. Top Clients by Revenue */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Top Clients by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No paid or sent invoices yet.</p>
          ) : (
            <div className="space-y-4">
              {topClients.map(([name, amount], idx) => {
                const pct = (amount / maxClientRevenue) * 100;
                return (
                  <div key={name} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">{name}</span>
                        <span className="text-sm font-bold text-emerald-400 ml-4 shrink-0">${fmt(amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs shrink-0">
                      {pct.toFixed(0)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E. Profit Margin by Client (Client Revenue breakdown) */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Profit Margin by Client</CardTitle>
        </CardHeader>
        <CardContent>
          {clientRevRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="text-left pb-2 font-medium">Client</th>
                    <th className="text-right pb-2 font-medium">Invoiced</th>
                    <th className="text-right pb-2 font-medium">Paid</th>
                    <th className="text-right pb-2 font-medium">Outstanding</th>
                    <th className="text-right pb-2 font-medium w-36">Payment Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRevRows.map((row) => {
                    const barColor = row.paymentRate >= 80 ? "bg-emerald-500" : row.paymentRate >= 50 ? "bg-yellow-400" : "bg-red-500";
                    const rateColor = row.paymentRate >= 80 ? "text-emerald-400" : row.paymentRate >= 50 ? "text-yellow-400" : "text-red-400";
                    return (
                      <tr key={row.name} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium text-white truncate max-w-[150px]">{row.name}</td>
                        <td className="py-3 text-right text-foreground">${fmt(row.totalInvoiced)}</td>
                        <td className="py-3 text-right text-emerald-400">${fmt(row.totalPaid)}</td>
                        <td className="py-3 text-right text-red-400">${fmt(row.outstanding)}</td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${row.paymentRate}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${rateColor} w-9 text-right shrink-0`}>{row.paymentRate.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
