"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, GitMerge, TrendingUp, DollarSign, AlertCircle } from "lucide-react";

interface ConsolidatedData {
  reportType: string;
  consolidated: { revenue: number; expenses: number; netIncome: number; assets: number; liabilities: number; equity: number };
  eliminationTotal: number;
  entityBreakdown: Array<{ entity: { id: string; name: string; code: string }; revenue: number; expenses: number; netIncome: number; assets: number; liabilities: number; equity: number }>;
  interCompanyTransactions: Array<{ id: string; fromEntityId: string; toEntityId: string; amount: number; description: string; eliminated: boolean }>;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function ConsolidationPage() {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("PL");
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, from: dateFrom, to: dateTo });
      const res = await fetch(`/api/consolidation?${params}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error("Failed to load consolidation report"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReport(); }, []);

  const c = data?.consolidated;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consolidated Financial Reports</h1>
          <p className="text-muted-foreground">Roll-up P&L and Balance Sheet across all entities</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v: string | null) => setReportType(v ?? "")}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PL">P&L Statement</SelectItem>
                  <SelectItem value="BS">Balance Sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
            </div>
            <Button onClick={fetchReport} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : c ? (
        <>
          {reportType === "PL" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(c.revenue)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-red-500" />Total Expenses</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-red-600">{fmt(c.expenses)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Net Income</CardTitle></CardHeader>
                <CardContent><p className={`text-2xl font-bold ${c.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(c.netIncome)}</p></CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{fmt(c.assets)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-red-600">{fmt(c.liabilities)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(c.equity)}</p></CardContent>
              </Card>
            </div>
          )}

          {data && data.eliminationTotal > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">Inter-company eliminations: {fmt(data.eliminationTotal)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><GitMerge className="h-5 w-5" />Entity Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Code</TableHead>
                    {reportType === "PL" ? (
                      <>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net Income</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-right">Assets</TableHead>
                        <TableHead className="text-right">Liabilities</TableHead>
                        <TableHead className="text-right">Equity</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entityBreakdown.map(row => (
                    <TableRow key={row.entity.id}>
                      <TableCell className="font-medium">{row.entity.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{row.entity.code}</code></TableCell>
                      {reportType === "PL" ? (
                        <>
                          <TableCell className="text-right text-emerald-600">{fmt(row.revenue)}</TableCell>
                          <TableCell className="text-right text-red-600">{fmt(row.expenses)}</TableCell>
                          <TableCell className={`text-right font-semibold ${row.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(row.netIncome)}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right">{fmt(row.assets)}</TableCell>
                          <TableCell className="text-right text-red-600">{fmt(row.liabilities)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{fmt(row.equity)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Consolidated Total</TableCell>
                    <TableCell></TableCell>
                    {reportType === "PL" ? (
                      <>
                        <TableCell className="text-right text-emerald-600">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmt(c.expenses)}</TableCell>
                        <TableCell className={`text-right ${c.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(c.netIncome)}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right">{fmt(c.assets)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmt(c.liabilities)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{fmt(c.equity)}</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
