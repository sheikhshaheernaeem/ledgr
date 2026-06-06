import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, ArrowLeftRight, Upload,
  FileText, Receipt, GitMerge, PiggyBank, CheckCircle2, Circle, AlertTriangle,
  Target, Repeat2,
} from "lucide-react";
import RevenueChart from "@/components/dashboard/RevenueChart";

function pctChange(thisVal: number, lastVal: number): number | null {
  if (lastVal === 0) return null;
  return ((thisVal - lastVal) / lastVal) * 100;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const now = new Date();
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [transactions, reports, openInvoices, bankAccounts, lastYearTxs, userGoal, recurringTxs, monthIncomeTxs] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 8 }),
    prisma.report.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.invoice.findMany({ where: { userId, status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.bankAccount.findMany({ where: { userId }, take: 1 }),
    prisma.transaction.findMany({
      where: { userId, status: "APPROVED", date: { gte: lastYearStart, lte: lastYearEnd } },
      select: { amount: true, type: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { revenueGoal: true } }),
    prisma.transaction.findMany({
      where: { userId, isRecurring: true },
      orderBy: { amount: "desc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { userId, status: "APPROVED", type: "CREDIT", date: { gte: monthStart, lte: now } },
      select: { amount: true },
    }),
  ]);

  const totalIncome = transactions.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const pendingCount = transactions.filter(t => t.status === "PENDING").length;
  const openInvoiceTotal = openInvoices.reduce((s, i) => s + i.total, 0);

  const lastYearIncome = lastYearTxs.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const lastYearExpenses = lastYearTxs.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const lastYearNet = lastYearIncome - lastYearExpenses;

  const incomePct = pctChange(totalIncome, lastYearIncome);
  const expensesPct = pctChange(totalExpenses, lastYearExpenses);
  const netPct = pctChange(netProfit, lastYearNet);

  // Onboarding checklist
  const hasTransactions = transactions.length > 0;
  const hasApprovedTransactions = transactions.some(t => t.status === "APPROVED");
  const hasInvoice = openInvoices.length > 0 || (await prisma.invoice.count({ where: { userId } })) > 0;
  const hasBankAccount = bankAccounts.length > 0;
  const onboardingDone = hasTransactions && hasApprovedTransactions && hasInvoice && hasBankAccount;

  const formatPct = (pct: number | null) => {
    if (pct === null) return null;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% vs last year`;
  };

  const stats = [
    { label: "Total Income", value: `$${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", yoy: formatPct(incomePct), yoyPositive: incomePct === null ? null : incomePct >= 0 },
    { label: "Total Expenses", value: `$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10", yoy: formatPct(expensesPct), yoyPositive: expensesPct === null ? null : expensesPct < 0 },
    { label: "Net Profit", value: `${netProfit >= 0 ? "+" : ""}$${Math.abs(netProfit).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: netProfit >= 0 ? "text-emerald-400" : "text-red-400", bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10", yoy: formatPct(netPct), yoyPositive: netPct === null ? null : netPct >= 0 },
    { label: "Transactions", value: `${transactions.length}`, icon: ArrowLeftRight, color: "text-blue-400", bg: "bg-blue-500/10", sub: pendingCount > 0 ? `${pendingCount} pending review` : "All reviewed", yoy: null, yoyPositive: null },
    { label: "Open Invoices", value: `$${openInvoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: Receipt, color: "text-yellow-400", bg: "bg-yellow-500/10", sub: `${openInvoices.length} unpaid`, yoy: null, yoyPositive: null },
  ];

  const onboardingSteps = [
    { label: "Upload your first transactions", done: hasTransactions, href: "/transactions" },
    { label: "Run AI categorization & approve", done: hasApprovedTransactions, href: "/transactions" },
    { label: "Create a bank account", done: hasBankAccount, href: "/accounts" },
    { label: "Send your first invoice", done: hasInvoice, href: "/invoices/new" },
  ];

  // Monthly goal tracking
  const revenueGoal = userGoal?.revenueGoal ?? null;
  const monthIncome = monthIncomeTxs.reduce((s, t) => s + t.amount, 0);

  // AR Aging widget data
  const nowMs = now.getTime();
  const overdueInvoices = openInvoices.filter(inv => new Date(inv.dueDate).getTime() < nowMs);
  const totalOverdueAmount = overdueInvoices.reduce((s, inv) => s + inv.total, 0);
  const oldestOverdue = overdueInvoices.length > 0
    ? overdueInvoices.reduce((oldest, inv) =>
        new Date(inv.dueDate) < new Date(oldest.dueDate) ? inv : oldest
      )
    : null;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {session.user.name ?? "there"} 👋</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your financial overview</p>
        </div>
        <Link href="/transactions">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Upload className="h-4 w-4" /> Upload Bank CSV
          </Button>
        </Link>
      </div>

      {/* Onboarding checklist — shown until all steps done */}
      {!onboardingDone && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-400">Get started with Ledgr</CardTitle>
            <CardDescription>Complete these steps to set up your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {onboardingSteps.map((step, i) => (
                <Link key={i} href={step.href}>
                  <div className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors cursor-pointer ${step.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-emerald-500/20"}`}>
                    {step.done
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                    <p className={`text-xs leading-snug ${step.done ? "text-emerald-300 line-through opacity-60" : "text-foreground"}`}>{step.label}</p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{onboardingSteps.filter(s => s.done).length}/{onboardingSteps.length} complete</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className={`grid gap-4 ${revenueGoal ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-2 lg:grid-cols-5"}`}>
        {stats.map(stat => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.yoy && (
                <p className={`text-xs mt-1 ${stat.yoyPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {stat.yoy}
                </p>
              )}
              {stat.sub && !stat.yoy && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}

        {/* Monthly Goal card */}
        {revenueGoal ? (() => {
          const pct = Math.min(100, (monthIncome / revenueGoal) * 100);
          const goalColor = pct >= 100 ? "text-emerald-400" : pct >= 60 ? "text-yellow-400" : "text-red-400";
          const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-500";
          return (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Goal</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <p className={`text-xl font-bold ${goalColor}`}>{pct.toFixed(0)}%</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  ${monthIncome.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} of ${revenueGoal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} goal
                </p>
              </CardContent>
            </Card>
          );
        })() : (
          <Card className="border-border bg-card border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
              <Target className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <Link href="/settings" className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors">Set a goal →</Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AR Aging widget — only shown when there are overdue invoices */}
      {overdueInvoices.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-400">Overdue Invoices</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? "s" : ""} past due
                    {oldestOverdue && (
                      <> · oldest due {new Date(oldestOverdue.dueDate).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 sm:gap-8">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount Overdue</p>
                  <p className="text-xl font-bold text-red-400">
                    ${totalOverdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Open AR</p>
                  <p className="text-lg font-semibold text-amber-400">
                    ${openInvoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Link href="/invoices">
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 cursor-pointer hover:bg-amber-500/10 whitespace-nowrap">
                    View Invoices →
                  </Badge>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/transactions", icon: Upload, label: "Upload CSV", desc: "Import bank transactions" },
            { href: "/invoices/new", icon: Receipt, label: "New Invoice", desc: "Create & send invoice" },
            { href: "/reconciliation/new", icon: GitMerge, label: "Reconcile", desc: "Match to bank statement" },
            { href: "/budget", icon: PiggyBank, label: "Budget", desc: "Set monthly targets" },
          ].map(action => (
            <Link key={action.href} href={action.href}>
              <Card className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <action.icon className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Revenue chart + recent transactions + reports */}
      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        {/* Recurring Transactions widget */}
        {recurringTxs.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat2 className="h-4 w-4 text-blue-400" />
                Recurring Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recurringTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.category ?? "Uncategorized"}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className={`text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                      </span>
                      <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">recurring</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="col-span-2 border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>Latest activity on your account</CardDescription>
              </div>
              <Link href="/transactions"><Button variant="outline" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowLeftRight className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No transactions yet</p>
                  <Link href="/transactions"><Button variant="outline" size="sm" className="mt-3">Upload your first CSV</Button></Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category ?? "Uncategorized"} · {new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                        <Badge variant="outline" className={`text-xs ${tx.status === "APPROVED" ? "border-emerald-500/30 text-emerald-400" : tx.status === "EDITED" ? "border-blue-500/30 text-blue-400" : "border-yellow-500/30 text-yellow-400"}`}>
                          {tx.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Reports</CardTitle>
                <CardDescription>Monthly P&amp;L summaries</CardDescription>
              </div>
              <Link href="/reports"><Button variant="outline" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No reports yet</p>
                  <p className="text-xs mt-1">Reports are generated after you upload transactions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <Link key={report.id} href={`/reports/${report.id}`}>
                      <div className="p-3 rounded-lg border border-border hover:border-emerald-500/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {new Date(report.year, report.month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                          </span>
                          <Badge variant="outline" className={`text-xs ${report.status === "SENT" ? "border-emerald-500/30 text-emerald-400" : report.status === "REVIEWED" ? "border-blue-500/30 text-blue-400" : "border-yellow-500/30 text-yellow-400"}`}>
                            {report.status.toLowerCase()}
                          </Badge>
                        </div>
                        <p className={`text-sm font-medium ${report.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {report.netProfit >= 0 ? "+" : ""}${Math.abs(report.netProfit).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
