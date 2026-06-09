"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart2, TrendingUp, PieChart, RefreshCw, Plus, X } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Types ───────────────────────────────────────────────────────────────────
interface DataPoint { key: string; value: number; budget?: number; }
interface Series { label: string; data: DataPoint[]; type: "timeseries" | "breakdown"; }
interface ChartResult { series1: Series; series2: Series | null; metric: string; metric2: string; }

// ── Constants ────────────────────────────────────────────────────────────────
const METRICS = [
  { value: "revenue",            label: "Revenue",               group: "Income & Expenses" },
  { value: "expenses",           label: "Expenses",              group: "Income & Expenses" },
  { value: "profit",             label: "Net Profit",            group: "Income & Expenses" },
  { value: "invoiced",           label: "Invoiced Amount",       group: "AR / AP" },
  { value: "bills",              label: "Bills Issued",          group: "AR / AP" },
  { value: "ar_balance",         label: "AR Outstanding",        group: "AR / AP" },
  { value: "ap_balance",         label: "AP Outstanding",        group: "AR / AP" },
  { value: "expense_by_category",label: "Expense by Category",   group: "Breakdowns" },
  { value: "revenue_by_client",  label: "Revenue by Client",     group: "Breakdowns" },
  { value: "budget_vs_actual",   label: "Budget vs Actual",      group: "Breakdowns" },
  { value: "bank_balances",      label: "Bank Balances",         group: "Assets" },
  { value: "inventory_value",    label: "Inventory Value",       group: "Assets" },
];

const PERIODS = [
  { value: "1m",  label: "Last 1 Month" },
  { value: "3m",  label: "Last 3 Months" },
  { value: "6m",  label: "Last 6 Months" },
  { value: "1y",  label: "Last 12 Months" },
  { value: "2y",  label: "Last 2 Years" },
];

const CHART_TYPES = [
  { value: "line",  label: "Line" },
  { value: "bar",   label: "Bar" },
  { value: "area",  label: "Area" },
  { value: "pie",   label: "Pie" },
  { value: "donut", label: "Donut" },
];

const GROUP_BY = [
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const PIE_COLORS = [
  "#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
];

const TIMESERIES_METRICS = ["revenue","expenses","profit","invoiced","bills","ar_balance","ap_balance"];

// ── Quick Chart Config ────────────────────────────────────────────────────────
const QUICK_CHARTS = [
  { metric: "revenue",             metric2: "expenses",  chartType: "bar",   period: "6m",  groupBy: "monthly",   label: "Revenue vs Expenses" },
  { metric: "profit",              metric2: "",          chartType: "area",  period: "6m",  groupBy: "monthly",   label: "Net Profit Trend" },
  { metric: "expense_by_category", metric2: "",          chartType: "pie",   period: "6m",  groupBy: "monthly",   label: "Expense Breakdown" },
  { metric: "revenue_by_client",   metric2: "",          chartType: "donut", period: "6m",  groupBy: "monthly",   label: "Revenue by Client" },
  { metric: "ar_balance",          metric2: "ap_balance",chartType: "bar",   period: "6m",  groupBy: "monthly",   label: "AR vs AP" },
  { metric: "budget_vs_actual",    metric2: "",          chartType: "bar",   period: "1y",  groupBy: "monthly",   label: "Budget vs Actual" },
];

// ── ChartPanel Component ──────────────────────────────────────────────────────
function ChartPanel({
  metric, metric2, chartType, period, groupBy, onClose, fmt,
}: {
  metric: string; metric2: string; chartType: string; period: string; groupBy: string;
  onClose?: () => void; fmt: (n: number) => string;
}) {
  const [data, setData] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!metric) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ metric, period, groupBy });
      if (metric2) params.set("metric2", metric2);
      const res = await fetch(`/api/charts?${params}`);
      if (res.ok) setData(await res.json());
      else toast.error("Failed to load chart data");
    } catch { toast.error("Failed to load chart data"); }
    finally { setLoading(false); }
  }, [metric, metric2, period, groupBy]);

  useEffect(() => { load(); }, [load]);

  const isBreakdown = !TIMESERIES_METRICS.includes(metric);
  const isPie = chartType === "pie" || chartType === "donut";
  const isBudgetVsActual = metric === "budget_vs_actual";

  const merged: (DataPoint & { value2?: number })[] = data?.series1.data.map(d => {
    const d2 = data.series2?.data.find(x => x.key === d.key);
    return { ...d, value2: d2?.value };
  }) ?? [];

  const total1 = data?.series1.data.reduce((s, d) => s + d.value, 0) ?? 0;
  const total2 = data?.series2?.data.reduce((s, d) => s + d.value, 0) ?? 0;
  const avg1 = merged.length ? total1 / merged.length : 0;
  const max1 = merged.reduce((m, d) => Math.max(m, d.value), 0);

  const metricLabel = METRICS.find(m => m.value === metric)?.label ?? metric;
  const metric2Label = METRICS.find(m => m.value === metric2)?.label ?? metric2;

  function formatTick(v: number) {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return String(v);
  }

  function renderChart() {
    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
    if (!data) return null;

    if (isPie && isBreakdown) {
      const pieData = data.series1.data.slice(0, 10);
      const innerRadius = chartType === "donut" ? "55%" : "0%";
      return (
        <ResponsiveContainer width="100%" height={300}>
          <RPieChart>
            <Pie data={pieData} dataKey="value" nameKey="key" cx="50%" cy="50%" outerRadius="80%" innerRadius={innerRadius} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
          </RPieChart>
        </ResponsiveContainer>
      );
    }

    if (isBudgetVsActual) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.series1.data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="budget" name="Budget" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="value" name="Actual" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (isBreakdown && chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={merged} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tickFormatter={formatTick} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis type="category" dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={80} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="value" name={metricLabel} fill="#10b981" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={merged} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="value" name={metricLabel} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            {metric2 && <Line type="monotone" dataKey="value2" name={metric2Label} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={merged} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend />
            <Area type="monotone" dataKey="value" name={metricLabel} stroke="#10b981" fill="url(#g1)" strokeWidth={2} />
            {metric2 && <Area type="monotone" dataKey="value2" name={metric2Label} stroke="#3b82f6" fill="url(#g2)" strokeWidth={2} />}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={merged} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
          <Legend />
          <Bar dataKey="value" name={metricLabel} fill="#10b981" radius={[3, 3, 0, 0]} />
          {metric2 && !isBreakdown && <Bar dataKey="value2" name={metric2Label} fill="#3b82f6" radius={[3, 3, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {metricLabel}{metric2 ? ` vs ${metric2Label}` : ""}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {onClose && <Button variant="ghost" size="sm" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>}
          </div>
        </div>
        {!loading && data && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>Total: <span className="text-foreground font-medium">{fmt(total1)}</span></span>
            <span>Avg: <span className="text-foreground font-medium">{fmt(avg1)}</span></span>
            <span>Max: <span className="text-foreground font-medium">{fmt(max1)}</span></span>
            {metric2 && <span>{metric2Label} Total: <span className="text-foreground font-medium">{fmt(total2)}</span></span>}
          </div>
        )}
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
interface PanelConfig {
  id: string;
  metric: string;
  metric2: string;
  chartType: string;
  period: string;
  groupBy: string;
  label?: string;
}

export default function ChartsPage() {
  const { fmt } = useLocale();

  // Builder form
  const [metric, setMetric]     = useState("revenue");
  const [metric2, setMetric2]   = useState("");
  const [chartType, setChartType] = useState("bar");
  const [period, setPeriod]     = useState("6m");
  const [groupBy, setGroupBy]   = useState("monthly");

  // Panels (custom + quick)
  const [panels, setPanels] = useState<PanelConfig[]>([]);
  const [quickLoaded, setQuickLoaded] = useState(false);

  // Load 2 default quick charts on mount
  useEffect(() => {
    if (!quickLoaded) {
      setPanels(QUICK_CHARTS.slice(0, 3).map((q, i) => ({ id: `quick-${i}`, ...q })));
      setQuickLoaded(true);
    }
  }, [quickLoaded]);

  function addPanel() {
    const id = `custom-${Date.now()}`;
    setPanels(p => [{ id, metric, metric2, chartType, period, groupBy }, ...p]);
  }

  function removePanel(id: string) {
    setPanels(p => p.filter(x => x.id !== id));
  }

  function loadQuickChart(q: typeof QUICK_CHARTS[0]) {
    const id = `quick-${Date.now()}`;
    setPanels(p => [{ id, ...q }, ...p]);
  }

  const isBreakdownMetric = !TIMESERIES_METRICS.includes(metric);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Charts & Analytics</h1>
        <p className="text-muted-foreground mt-1">Visualize any metric, compare data, and explore your financials</p>
      </div>

      {/* Chart Builder */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-emerald-400" /> Chart Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            {/* Metric 1 */}
            <div className="space-y-1.5">
              <Label className="text-xs">Metric</Label>
              <Select value={metric} onValueChange={v => { setMetric(v ?? "revenue"); if (!TIMESERIES_METRICS.includes(v ?? "")) setMetric2(""); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Income & Expenses","AR / AP","Breakdowns","Assets"].map(group => (
                    <div key={group}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{group}</div>
                      {METRICS.filter(m => m.group === group).map(m => (
                        <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metric 2 (compare) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Compare With</Label>
              <Select value={metric2} onValueChange={v => setMetric2(v ?? "")} disabled={isBreakdownMetric}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">— None —</SelectItem>
                  {METRICS.filter(m => m.value !== metric && TIMESERIES_METRICS.includes(m.value)).map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Chart Type</Label>
              <Select value={chartType} onValueChange={v => setChartType(v ?? "bar")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <Label className="text-xs">Period</Label>
              <Select value={period} onValueChange={v => setPeriod(v ?? "6m")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-1.5">
              <Label className="text-xs">Group By</Label>
              <Select value={groupBy} onValueChange={v => setGroupBy(v ?? "monthly")} disabled={isBreakdownMetric}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_BY.map(g => <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Add Button */}
            <Button onClick={addPanel} className="h-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Chart
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Charts */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Charts</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_CHARTS.map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => loadQuickChart(q)}
            >
              {q.chartType === "pie" || q.chartType === "donut" ? <PieChart className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart Panels */}
      {panels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No charts yet</p>
          <p className="text-sm mt-1">Use the builder above or click a Quick Chart to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {panels.map(panel => (
            <ChartPanel
              key={panel.id}
              metric={panel.metric}
              metric2={panel.metric2}
              chartType={panel.chartType}
              period={panel.period}
              groupBy={panel.groupBy}
              onClose={() => removePanel(panel.id)}
              fmt={fmt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
