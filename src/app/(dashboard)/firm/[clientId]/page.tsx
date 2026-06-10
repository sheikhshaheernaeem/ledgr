"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, Building2, Upload, CheckCircle2, Clock, BarChart3,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string;
  subcategory: string;
  status: string;
  confidence: number;
}

interface Statement {
  id: string;
  filename: string;
  rowCount: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  errorMsg: string | null;
}

interface Report {
  id: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  status: string;
  clientApprovedAt: string | null;
}

interface ClientData {
  client: { id: string; name: string | null; email: string; companyName: string | null };
  summary: {
    thisMonth: { revenue: number; expenses: number; netProfit: number; transactionCount: number };
    invoices: { open: number; overdue: number; openAmount: number; recentOpen: Array<{ id: string; status: string; total: number; dueDate: string; clientName: string }> };
    lastReport: { month: number; year: number; totalIncome: number; totalExpenses: number; netProfit: number; status: string } | null;
  };
  statements: Statement[];
  transactions: Transaction[];
  categoryBreakdown: { category: string; amount: number }[];
  reports: Report[];
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const stmtColor: Record<string, string> = {
  CATEGORIZED: "border-emerald-500/30 text-emerald-400",
  PROCESSING: "border-yellow-500/30 text-yellow-400",
  ERROR: "border-red-500/30 text-red-400",
};

const reportColor: Record<string, string> = {
  APPROVED: "border-emerald-500/30 text-emerald-400",
  SENT: "border-blue-500/30 text-blue-400",
  REVIEWED: "border-purple-500/30 text-purple-400",
  DRAFT: "border-yellow-500/30 text-yellow-400",
};

export default function ClientWorkspacePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/managed-clients/${clientId}`);
        if (!res.ok) {
          if (res.status === 404) toast.error("Client not found or access revoked");
          else throw new Error();
          return;
        }
        setData(await res.json());
      } catch {
        toast.error("Failed to load client data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading client workspace…</div>;
  if (!data) return (
    <div className="p-8 space-y-4">
      <Link href="/service" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <p className="text-muted-foreground">Client not found or you no longer have access.</p>
    </div>
  );

  const { client, summary, statements, transactions, categoryBreakdown, reports } = data;
  const displayName = client.companyName || client.name || client.email;
  const credits = transactions.filter((t) => t.type === "CREDIT");
  const debits = transactions.filter((t) => t.type === "DEBIT");
  const totalRevenue = credits.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = debits.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/service" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Service Ops
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {client.companyName && client.name && (
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                <Building2 className="h-3.5 w-3.5" /> {client.name} · {client.email}
              </div>
            )}
            {!client.companyName && (
              <p className="text-muted-foreground text-sm mt-0.5">{client.email}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
              {statements.length} upload{statements.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
              {transactions.length} transactions
            </Badge>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue (MTD)</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{fmt(summary.thisMonth.revenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.thisMonth.transactionCount} txns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Expenses (MTD)</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{fmt(summary.thisMonth.expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net (MTD)</p>
              <DollarSign className={`h-4 w-4 ${summary.thisMonth.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${summary.thisMonth.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(Math.abs(summary.thisMonth.netProfit))}
            </p>
            <p className="text-xs text-muted-foreground">{summary.thisMonth.netProfit >= 0 ? "profit" : "loss"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Invoices</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{summary.invoices.open}</p>
            {summary.invoices.overdue > 0 && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3" /> {summary.invoices.overdue} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          <TabsTrigger value="statements">Uploads ({statements.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* ── Transactions ── */}
        <TabsContent value="transactions" className="mt-4">
          {statements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No uploads yet</p>
                <p className="text-sm mt-1">Client hasn&apos;t uploaded a bank statement yet.</p>
              </CardContent>
            </Card>
          ) : transactions.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No transactions found.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-border">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px]">
                          <p className="truncate">{tx.description}</p>
                          {tx.subcategory && <p className="text-xs text-muted-foreground">{tx.subcategory}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          <span className={tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}>
                            {tx.type === "CREDIT" ? "+" : "-"}{fmtD(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${tx.type === "CREDIT" ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}`}>
                            {tx.type.toLowerCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-3 border-t border-border grid grid-cols-3 text-sm">
                  <div><span className="text-muted-foreground">Total Revenue</span><p className="font-bold text-emerald-400">{fmtD(totalRevenue)}</p></div>
                  <div><span className="text-muted-foreground">Total Expenses</span><p className="font-bold text-red-400">{fmtD(totalExpenses)}</p></div>
                  <div><span className="text-muted-foreground">Net Profit</span><p className={`font-bold ${totalRevenue - totalExpenses >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtD(totalRevenue - totalExpenses)}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Category Breakdown ── */}
        <TabsContent value="breakdown" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Expense by Category</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {categoryBreakdown.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">No expense data yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {categoryBreakdown.map(({ category, amount }) => {
                      const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                      return (
                        <div key={category} className="px-6 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-foreground">{category}</span>
                            <span className="text-sm font-semibold text-foreground">{fmtD(amount)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% of expenses</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">P&amp;L Summary (All Time)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-bold text-emerald-400">{fmtD(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <span className="font-bold text-red-400">{fmtD(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-semibold text-foreground">Net Profit</span>
                  <span className={`text-lg font-bold ${totalRevenue - totalExpenses >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalRevenue - totalExpenses >= 0 ? "+" : ""}{fmtD(totalRevenue - totalExpenses)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  Based on {transactions.length} transactions across {statements.length} uploaded file{statements.length !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Statements / Uploads ── */}
        <TabsContent value="statements" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {statements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No uploads yet</p>
                  <p className="text-sm mt-1">Client will upload their bank statement CSV from their portal.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>File</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-center">Rows</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statements.map((s) => (
                      <TableRow key={s.id} className="border-border">
                        <TableCell className="font-mono text-sm">{s.filename}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.periodStart && s.periodEnd
                            ? `${new Date(s.periodStart).toLocaleDateString()} – ${new Date(s.periodEnd).toLocaleDateString()}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{s.rowCount}</TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className={`text-xs ${stmtColor[s.status] ?? "border-border text-muted-foreground"}`}>
                              {s.status.toLowerCase()}
                            </Badge>
                            {s.errorMsg && <p className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate">{s.errorMsg}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No reports yet</p>
                  <p className="text-sm mt-1">Reports are generated automatically on the 2nd of each month.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Period</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Net Profit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.id} className="border-border">
                        <TableCell className="text-sm font-medium">
                          {new Date(r.year, r.month - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm text-emerald-400">{fmtD(r.totalIncome)}</TableCell>
                        <TableCell className="text-sm text-red-400">{fmtD(r.totalExpenses)}</TableCell>
                        <TableCell className={`text-sm font-semibold ${r.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.netProfit >= 0 ? "+" : ""}{fmtD(r.netProfit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${reportColor[r.status] ?? "border-border text-muted-foreground"}`}>
                            {r.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.clientApprovedAt ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {new Date(r.clientApprovedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
