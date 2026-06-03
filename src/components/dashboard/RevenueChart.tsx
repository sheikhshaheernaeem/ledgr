"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface MonthData { month: number; year: number; income: number; expenses: number; }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function RevenueChart() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/chart")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (data.length === 0 || data.every(m => m.income === 0 && m.expenses === 0)) {
    return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No approved transactions yet — upload and categorize a CSV to see your chart.</div>;
  }

  const maxVal = Math.max(...data.flatMap(m => [m.income, m.expenses]), 1);
  const H = 140;
  const barW = 20;
  const gap = 8;
  const groupW = barW * 2 + gap;
  const monthGap = 32;
  const totalW = data.length * (groupW + monthGap);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> Income</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500" /> Expenses</div>
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(totalW, 400)} height={H + 36} className="block">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = H - pct * H;
            const label = pct === 0 ? "" : `$${((maxVal * pct) / 1000).toFixed(0)}k`;
            return (
              <g key={pct}>
                <line x1={0} y1={y} x2={totalW} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
                {label && <text x={2} y={y - 3} fill="currentColor" fillOpacity={0.4} fontSize={10}>{label}</text>}
              </g>
            );
          })}

          {data.map((m, i) => {
            const x = i * (groupW + monthGap) + monthGap / 2;
            const incH = Math.max(2, Math.round((m.income / maxVal) * H));
            const expH = Math.max(2, Math.round((m.expenses / maxVal) * H));
            const centerX = x + groupW / 2;
            return (
              <g key={`${m.year}-${m.month}`}>
                {/* Income bar */}
                <rect x={x} y={H - incH} width={barW} height={incH} fill="#10b981" rx={3} opacity={0.9}>
                  <title>Income: ${m.income.toLocaleString()}</title>
                </rect>
                {/* Expenses bar */}
                <rect x={x + barW + gap} y={H - expH} width={barW} height={expH} fill="#ef4444" rx={3} opacity={0.9}>
                  <title>Expenses: ${m.expenses.toLocaleString()}</title>
                </rect>
                {/* Month label */}
                <text x={centerX} y={H + 16} textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize={11}>
                  {MONTH_NAMES[m.month]}
                </text>
                <text x={centerX} y={H + 28} textAnchor="middle" fill="currentColor" fillOpacity={0.3} fontSize={9}>
                  {m.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
