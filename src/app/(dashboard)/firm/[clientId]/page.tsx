"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, FileText, AlertTriangle, Building2,
} from "lucide-react";

interface ClientData {
  client: {
    id: string;
    name: string | null;
    email: string;
    companyName: string | null;
  };
  summary: {
    thisMonth: {
      revenue: number;
      expenses: number;
      netProfit: number;
      transactionCount: number;
    };
    invoices: {
      open: number;
      overdue: number;
      openAmount: number;
      recentOpen: Array<{
        id: string;
        status: string;
        total: number;
        dueDate: string;
        clientName: string;
      }>;
    };
    lastReport: {
      month: number;
      year: number;
      totalIncome: number;
      totalExpenses: number;
      netProfit: number;
      status: string;
    } | null;
  };
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientWorkspacePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);

  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/managed-clients/${clientId}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Client not found or access revoked");
          } else {
            throw new Error();
          }
          return;
        }
        setData(await res.json());
      } catch {
        toast.error("Failed to load client data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!data) return (
    <div className="p-8 space-y-4">
      <Link href="/firm" className="text-sm text-muted-foreground hover:text-white flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>
      <p className="text-muted-foreground">Client not found or you no longer have access.</p>
    </div>
  );

  const { client, summary } = data;
  const displayName = client.name ?? client.email;
  const monthName = summary.lastReport
    ? new Date(summary.lastReport.year, summary.lastReport.month - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/firm" className="text-sm text-muted-foreground hover:text-white flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{displayName}&apos;s Books</h1>
            {client.companyName && (
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                <Building2 className="h-3.5 w-3.5" /> {client.companyName}
              </div>
            )}
          </div>
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 shrink-0">
            Read-Only View
          </Badge>
        </div>
      </div>

      {/* Note Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Viewing <span className="text-white font-medium">{displayName}</span>&apos;s workspace. This is a read-only summary of their books.
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue (MTD)</p>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">${fmt(summary.thisMonth.revenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.thisMonth.transactionCount} transactions</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Expenses (MTD)</p>
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-400">${fmt(summary.thisMonth.expenses)}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit (MTD)</p>
                  <DollarSign className={`h-4 w-4 ${summary.thisMonth.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <p className={`text-2xl font-bold ${summary.thisMonth.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {summary.thisMonth.netProfit >= 0 ? "+" : ""}${fmt(Math.abs(summary.thisMonth.netProfit))}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Invoices</p>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.invoices.open}</p>
                {summary.invoices.overdue > 0 && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> {summary.invoices.overdue} overdue
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Last Report Summary */}
          {summary.lastReport && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Last Report — {monthName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Income</p>
                    <p className="text-lg font-semibold text-emerald-400">${fmt(summary.lastReport.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-semibold text-red-400">${fmt(summary.lastReport.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`text-lg font-semibold ${summary.lastReport.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {summary.lastReport.netProfit >= 0 ? "+" : ""}${fmt(Math.abs(summary.lastReport.netProfit))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary.invoices.recentOpen.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No open invoices</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.invoices.recentOpen.map((inv) => (
                      <TableRow key={inv.id} className="border-border">
                        <TableCell className="text-sm text-white">{inv.clientName}</TableCell>
                        <TableCell className="text-sm font-medium">${fmt(inv.total)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              inv.status === "OVERDUE"
                                ? "border-red-500/30 text-red-400"
                                : "border-yellow-500/30 text-yellow-400"
                            }`}
                          >
                            {inv.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="p-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total outstanding</span>
                <span className="font-bold text-white">${fmt(summary.invoices.openAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Reports are managed by the client</p>
              <p className="text-xs mt-1">
                {summary.lastReport
                  ? `Last report: ${monthName}`
                  : "No reports available for this client yet."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
