"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";

interface BudgetRow { category: string; budgeted: number; actual: number; variance: number; }

const CATEGORIES = [
  "Revenue","Cost of Goods Sold","Payroll & Benefits","Rent & Utilities",
  "Software & Subscriptions","Marketing & Advertising","Professional Services",
  "Office Supplies","Travel & Entertainment","Banking & Fees","Taxes",
  "Insurance","Other Expense","Other Income",
];

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
    if (res.ok) {
      const data: BudgetRow[] = await res.json();
      setRows(data);
      const e: Record<string, string> = {};
      data.forEach(r => { e[r.category] = r.budgeted > 0 ? String(r.budgeted) : ""; });
      setEdits(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [month, year]);

  async function save() {
    setSaving(true);
    const budgets = CATEGORIES
      .filter(c => edits[c] && parseFloat(edits[c]) > 0)
      .map(c => ({ category: c, amount: parseFloat(edits[c]) }));
    const res = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, budgets }),
    });
    if (res.ok) { toast.success("Budgets saved"); load(); }
    else toast.error("Failed to save");
    setSaving(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const totalBudgeted = CATEGORIES.reduce((s, c) => s + (parseFloat(edits[c]) || 0), 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget vs Actual</h1>
          <p className="text-muted-foreground mt-1">Set monthly targets and track performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <Input type="number" className="w-24" value={year} onChange={e => setYear(Number(e.target.value))} />
          <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Expense Categories — {months[month-1]} {year}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-4 text-xs text-muted-foreground uppercase px-2 pb-2">
                <div className="col-span-3">Category</div>
                <div className="col-span-2 text-right">Budgeted</div>
                <div className="col-span-2 text-right">Actual</div>
                <div className="col-span-2 text-right">Variance</div>
                <div className="col-span-3">Progress</div>
              </div>
              {CATEGORIES.map(cat => {
                const row = rows.find(r => r.category === cat);
                const budgeted = parseFloat(edits[cat]) || 0;
                const actual = row?.actual ?? 0;
                const variance = budgeted - actual;
                const pct = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 0;
                const barColor = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-emerald-500";
                return (
                  <div key={cat} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-border/40 last:border-0 px-2">
                    <div className="col-span-3 text-sm">{cat}</div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="1" placeholder="0" value={edits[cat] ?? ""}
                        onChange={e => setEdits(p => ({ ...p, [cat]: e.target.value }))}
                        className="h-7 text-xs text-right" />
                    </div>
                    <div className="col-span-2 text-right text-sm">{actual > 0 ? `$${actual.toFixed(0)}` : "—"}</div>
                    <div className={`col-span-2 text-right text-sm font-medium ${variance < 0 ? "text-red-400" : variance > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {budgeted > 0 ? `${variance >= 0 ? "+" : ""}$${variance.toFixed(0)}` : "—"}
                    </div>
                    <div className="col-span-3">
                      {budgeted > 0 ? (
                        <div className="w-full bg-border rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-4 items-center py-3 px-2 font-bold text-foreground border-t border-border mt-2">
                <div className="col-span-3 text-sm">Total</div>
                <div className="col-span-2 text-right text-sm">${totalBudgeted.toFixed(0)}</div>
                <div className="col-span-2 text-right text-sm">${totalActual.toFixed(0)}</div>
                <div className={`col-span-2 text-right text-sm ${totalBudgeted - totalActual < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {totalBudgeted > 0 ? `${totalBudgeted - totalActual >= 0 ? "+" : ""}$${(totalBudgeted - totalActual).toFixed(0)}` : "—"}
                </div>
                <div className="col-span-3" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
