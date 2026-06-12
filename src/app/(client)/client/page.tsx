import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, CheckCircle2, Clock, TrendingUp, TrendingDown, ExternalLink, Upload,
  Receipt, FolderOpen,
} from "lucide-react";
import { InsightsFeed } from "@/components/client/InsightsFeed";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  // First-time user → onboarding wizard
  const [statementCount, currentUser] = await Promise.all([
    prisma.statement.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { companyName: true } }),
  ]);
  if (statementCount === 0 && !currentUser?.companyName) {
    redirect("/client/onboarding");
  }

  // Latest statement
  const latestStatement = await prisma.statement.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, filename: true, createdAt: true },
  });

  // Open invoices
  const openInvoices = await prisma.invoice.findMany({
    where: { userId, status: { in: ["SENT", "OVERDUE"] } },
    orderBy: { dueDate: "asc" },
  });

  const totalDue = openInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);

  // Recent reports
  const recentReports = await prisma.report.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 5,
  });

  // Last 5 transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
  });

  const displayName = session.user.name ?? session.user.email ?? "there";
  const pendingApproval = recentReports.filter((r) => r.status === "SENT" && !r.clientApprovedAt);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {displayName}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s an overview of your account</p>
      </div>

      {/* Primary action: upload — the service starts here */}
      <Link href="/client/upload" className="block">
        <div className="rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] hover:border-emerald-500/50 transition-colors p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Upload a bank statement</p>
            <p className="text-sm text-muted-foreground mt-0.5">Drop a CSV — we&apos;ll have it categorized in minutes.</p>
          </div>
          <div className="font-mono text-xs text-emerald-500 hidden sm:block">drop → categorize → report</div>
        </div>
      </Link>

      {/* AI-driven insights */}
      <InsightsFeed userId={userId} />

      {/* Quick links — service-shaped utilities */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickLink href="/client/tax" icon={Receipt} label="Tax estimate" desc="Quarterly view" />
        <QuickLink href="/client/invoices" icon={FileText} label="Invoices" desc="What's owed to you" />
        <QuickLink href="/client/documents" icon={FolderOpen} label="Documents" desc="Receipts &amp; forms" />
        <QuickLink href="/client/financials" icon={TrendingUp} label="My books" desc="Live financials" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Invoices</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{openInvoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">${fmt(totalDue)} total due</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Approvals</p>
              <Clock className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingApproval.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Reports awaiting your review</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Reports</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{recentReports.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly financial reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload banner */}
      <Card className={`border ${latestStatement?.status === "CATEGORIZED" ? "border-emerald-500/30 bg-emerald-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {latestStatement?.status === "CATEGORIZED" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Upload className="h-5 w-5 text-blue-400 shrink-0" />
            )}
            <div>
              {latestStatement ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {latestStatement.status === "CATEGORIZED" ? "Statement processed — report coming soon" : `Processing: ${latestStatement.filename}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Uploaded {new Date(latestStatement.createdAt).toLocaleDateString()}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">Upload your bank statement</p>
                  <p className="text-xs text-muted-foreground">Export as CSV from your bank · we'll categorize every transaction automatically</p>
                </>
              )}
            </div>
          </div>
          <Link href="/client/upload">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shrink-0">
              <Upload className="h-3.5 w-3.5" />
              {latestStatement ? "Upload New" : "Upload Now"}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/client/invoices">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> View Invoices
          </Button>
        </Link>
        <Link href="/client/reports">
          <Button variant="outline" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Approve Reports
          </Button>
        </Link>
        <Link href="/client/upload">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Statement
          </Button>
        </Link>
      </div>

      {/* Recent reports */}
      {recentReports.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => {
                  const monthName = new Date(report.year, report.month - 1).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <TableRow key={report.id} className="border-border">
                      <TableCell className="text-sm text-foreground">{monthName}</TableCell>
                      <TableCell className="text-sm text-emerald-600 dark:text-emerald-400">
                        ${fmt(report.totalIncome)}
                      </TableCell>
                      <TableCell className="text-sm text-red-400">${fmt(report.totalExpenses)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            report.status === "APPROVED"
                              ? "border-emerald-500/30 text-emerald-400"
                              : report.status === "SENT"
                              ? "border-blue-500/30 text-blue-400"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {report.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.clientApprovedAt ? (
                          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                            Approved
                          </Badge>
                        ) : report.clientApprovalToken ? (
                          <Link href={`/reports/${report.id}/approve`} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                            Approve <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Last 5 transactions */}
      {recentTransactions.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[180px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tx.category ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          tx.type === "CREDIT"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {tx.type === "CREDIT" ? "+" : "-"}${fmt(tx.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-400" /> Credits in green ·{" "}
                <TrendingDown className="h-3 w-3 text-muted-foreground" /> Debits in default
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {recentTransactions.length === 0 && recentReports.length === 0 && openInvoices.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">Your transactions, invoices, and reports will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, desc }: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string;
}) {
  return (
    <Link href={href} className="block rounded-lg border border-border/60 bg-card/40 hover:bg-card hover:border-emerald-500/30 transition-colors p-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
