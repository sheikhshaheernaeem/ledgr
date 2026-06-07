"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, BarChart2, Shield, Zap } from "lucide-react";

interface Ratios {
  currentRatio: number | null; quickRatio: number | null; cashRatio: number | null;
  grossMargin: number | null; netMargin: number | null; returnOnAssets: number | null; returnOnEquity: number | null;
  debtToEquity: number | null; debtRatio: number | null; interestCoverage: number | null;
  assetTurnover: number | null; inventoryTurnover: number | null; receivablesDays: number | null; payablesDays: number | null;
}

const fmtRatio = (v: number | null, type: "ratio" | "pct" | "days" = "ratio") => {
  if (v === null) return "N/A";
  if (type === "pct") return `${v.toFixed(1)}%`;
  if (type === "days") return `${v.toFixed(0)} days`;
  return v.toFixed(2);
};

function RatioCard({ label, value, type = "ratio", benchmark, description }: { label: string; value: number | null; type?: "ratio" | "pct" | "days"; benchmark?: string; description?: string }) {
  return (
    <div className="p-4 border rounded-lg space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{fmtRatio(value, type)}</p>
      {benchmark && <p className="text-xs text-muted-foreground">Benchmark: {benchmark}</p>}
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RatiosPage() {
  const [ratios, setRatios] = useState<Ratios | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  async function fetchRatios() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year, month });
      const res = await fetch(`/api/reports/ratios?${params}`);
      const data = await res.json();
      setRatios(data.ratios);
    } catch { toast.error("Failed to load ratios"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchRatios(); }, []);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Ratios Dashboard</h1>
          <p className="text-muted-foreground">Key financial ratios calculated from your books</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v: string | null) => setYear(v ?? '')}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={month} onValueChange={(v: string | null) => setMonth(v ?? '')}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button onClick={fetchRatios} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Calculate Ratios</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : ratios ? (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500" />Liquidity Ratios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RatioCard label="Current Ratio" value={ratios.currentRatio} benchmark="&gt; 2.0" description="Ability to meet short-term obligations" />
                <RatioCard label="Quick Ratio" value={ratios.quickRatio} benchmark="&gt; 1.0" description="Current assets minus inventory / Current liabilities" />
                <RatioCard label="Cash Ratio" value={ratios.cashRatio} benchmark="&gt; 0.5" description="Most conservative liquidity measure" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" />Profitability Ratios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <RatioCard label="Gross Margin" value={ratios.grossMargin} type="pct" benchmark="&gt; 40%" description="Gross profit as % of revenue" />
                <RatioCard label="Net Margin" value={ratios.netMargin} type="pct" benchmark="&gt; 10%" description="Net income as % of revenue" />
                <RatioCard label="Return on Assets" value={ratios.returnOnAssets} type="pct" benchmark="&gt; 5%" description="Net income / Total assets" />
                <RatioCard label="Return on Equity" value={ratios.returnOnEquity} type="pct" benchmark="&gt; 15%" description="Net income / Total equity" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5 text-amber-500" />Solvency Ratios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RatioCard label="Debt to Equity" value={ratios.debtToEquity} benchmark="&lt; 2.0" description="Total liabilities / Total equity" />
                <RatioCard label="Debt Ratio" value={ratios.debtRatio} benchmark="&lt; 0.5" description="Total liabilities / Total assets" />
                <RatioCard label="Interest Coverage" value={ratios.interestCoverage} benchmark="&gt; 3.0" description="EBIT / Interest expense" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-purple-500" />Efficiency Ratios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <RatioCard label="Asset Turnover" value={ratios.assetTurnover} benchmark="&gt; 1.0" description="Revenue / Total assets" />
                <RatioCard label="Inventory Turnover" value={ratios.inventoryTurnover} benchmark="&gt; 4.0" description="COGS / Inventory" />
                <RatioCard label="Days Receivable" value={ratios.receivablesDays} type="days" benchmark="&lt; 45 days" description="Time to collect receivables" />
                <RatioCard label="Days Payable" value={ratios.payablesDays} type="days" benchmark="30-45 days" description="Time to pay suppliers" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Click "Calculate Ratios" to generate financial ratio analysis.</p>
        </div>
      )}
    </div>
  );
}
