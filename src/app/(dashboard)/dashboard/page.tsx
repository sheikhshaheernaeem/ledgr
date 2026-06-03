import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeftRight,
  Upload,
  FileText,
  Receipt,
  GitMerge,
  TrendingUp as ForecastIcon,
  PiggyBank,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id as string;

  const [transactions, reports, openInvoices] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 8,
    }),
    prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "OVERDUE"] } },
    }),
  ]);

  const totalIncome = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;
  const openInvoiceTotal = openInvoices.reduce((s, i) => s + i.total, 0);

  const stats = [
    {
      label: "Total Income",
      value: `$${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total Expenses",
      value: `$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Net Profit",
      value: `${netProfit >= 0 ? "+" : ""}$${Math.abs(netProfit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: netProfit >= 0 ? "text-emerald-400" : "text-red-400",
      bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Transactions",
      value: `${transactions.length}`,
      icon: ArrowLeftRight,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      sub: pendingCount > 0 ? `${pendingCount} pending review` : "All reviewed",
    },
    {
      label: "Open Invoices",
      value: `$${openInvoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Receipt,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      sub: `${openInvoices.length} unpaid`,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {session.user.name ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your financial overview
          </p>
        </div>
        <Link href="/transactions">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Upload className="h-4 w-4" />
            Upload Bank CSV
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.sub && (
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/transactions", icon: Upload, label: "Upload CSV", desc: "Import bank transactions" },
            { href: "/invoices/new", icon: Receipt, label: "New Invoice", desc: "Create & send invoice" },
            { href: "/reconciliation/new", icon: GitMerge, label: "Reconcile", desc: "Match to bank statement" },
            { href: "/forecast", icon: ForecastIcon, label: "Forecast", desc: "AI cash flow prediction" },
          ].map(action => (
            <Link key={action.href} href={action.href}>
              <Card className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <action.icon className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="col-span-2 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <CardDescription>Latest activity on your account</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No transactions yet</p>
                <Link href="/transactions">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Upload your first CSV
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.category ?? "Uncategorized"} ·{" "}
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span
                        className={`text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {tx.type === "CREDIT" ? "+" : "-"}$
                        {tx.amount.toFixed(2)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          tx.status === "APPROVED"
                            ? "border-emerald-500/30 text-emerald-400"
                            : tx.status === "EDITED"
                              ? "border-blue-500/30 text-blue-400"
                              : "border-yellow-500/30 text-yellow-400"
                        }`}
                      >
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
            <Link href="/reports">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reports yet</p>
                <p className="text-xs mt-1">
                  Reports are generated after you upload transactions
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Link key={report.id} href={`/reports/${report.id}`}>
                    <div className="p-3 rounded-lg border border-border hover:border-emerald-500/30 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          {new Date(report.year, report.month - 1).toLocaleString(
                            "default",
                            { month: "long", year: "numeric" }
                          )}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            report.status === "SENT"
                              ? "border-emerald-500/30 text-emerald-400"
                              : report.status === "REVIEWED"
                                ? "border-blue-500/30 text-blue-400"
                                : "border-yellow-500/30 text-yellow-400"
                          }`}
                        >
                          {report.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm font-medium ${report.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {report.netProfit >= 0 ? "+" : ""}$
                        {Math.abs(report.netProfit).toLocaleString()}
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
  );
}
