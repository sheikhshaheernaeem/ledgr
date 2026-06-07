"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface VarianceRow { category: string; budget: number; actual: number; variance: number; variancePct: number | null; favorable: boolean }
interface VarianceData { year: number; month: number; rows: VarianceRow[]; totals: { budget: number; actual: number; variance: number } }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const MONTHS = ["All Year", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function VariancePage() {
  const [data, setData] = useState<VarianceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("0");

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year, month });
      const res = await fetch(`/api/reports/variance?${params}`);
      setData(await res.json());
    } catch { toast.error("Failed to load variance report"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReport(); }, []);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget vs Actual Variance</h1>
          <p className="text-muted-foreground">Compare budgeted amounts against actual spending</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button onClick={fetchReport} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Run Report</Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(data.totals.budget)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Actual</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(data.totals.actual)}</p></CardContent>
            </Card>
            <Card className={data.totals.variance >= 0 ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">{data.totals.variance >= 0 ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : <TrendingUp className="h-4 w-4 text-red-500" />}Total Variance</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${data.totals.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(data.totals.variance)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data for this period. Make sure you have budgets and transactions.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance ($)</TableHead>
                      <TableHead className="text-right">Variance (%)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map(row => (
                      <TableRow key={row.category}>
                        <TableCell className="font-medium">{row.category}</TableCell>
                        <TableCell className="text-right">{fmt(row.budget)}</TableCell>
                        <TableCell className="text-right">{fmt(row.actual)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(row.variance)}</TableCell>
                        <TableCell className={`text-right ${row.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{row.variancePct !== null ? fmtPct(row.variancePct) : "—"}</TableCell>
                        <TableCell className="text-center">
                          {row.favorable ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><TrendingDown className="h-3 w-3" />Favorable</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400"><TrendingUp className="h-3 w-3" />Unfavorable</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 bg-muted/30">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{fmt(data.totals.budget)}</TableCell>
                      <TableCell className="text-right">{fmt(data.totals.actual)}</TableCell>
                      <TableCell className={`text-right ${data.totals.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(data.totals.variance)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
