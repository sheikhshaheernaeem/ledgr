"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, TrendingUp, TrendingDown, Minus, Brain, Trash2 } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  assumptions: Record<string, number>;
  projections: { month: string; baseline: number; projected: number; delta: number }[];
  summary: string | null;
  createdAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const DEFAULT_ASSUMPTIONS = [
  { key: "newHires", label: "New Hires", placeholder: "5", unit: "people" },
  { key: "avgSalary", label: "Avg Salary", placeholder: "85000", unit: "$/yr" },
  { key: "revenueGrowth", label: "Revenue Growth", placeholder: "15", unit: "%" },
  { key: "cogs", label: "COGS Change", placeholder: "10", unit: "%" },
  { key: "opexChange", label: "OpEx Change", placeholder: "8", unit: "%" },
  { key: "marketingSpend", label: "Marketing Spend", placeholder: "20000", unit: "$/mo" },
];

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    newHires: "",
    avgSalary: "",
    revenueGrowth: "",
    cogs: "",
    opexChange: "",
    marketingSpend: "",
  });

  async function fetchScenarios() {
    setLoading(true);
    try {
      const res = await fetch("/api/scenarios");
      const data = await res.json();
      setScenarios(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load scenarios"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchScenarios(); }, []);

  async function runScenario() {
    if (!form.name) { toast.error("Scenario name required"); return; }
    setRunning(true);
    try {
      const assumptions: Record<string, number> = {};
      DEFAULT_ASSUMPTIONS.forEach(({ key }) => {
        const val = form[key as keyof typeof form];
        if (val) assumptions[key] = parseFloat(val as string);
      });

      const res = await fetch("/api/ai/scenario-modeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description, assumptions }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Scenario generated");
      setShowDialog(false);
      fetchScenarios();
      setSelected(data.scenario || null);
    } catch { toast.error("Failed to run scenario"); }
    finally { setRunning(false); }
  }

  async function deleteScenario(id: string) {
    if (!confirm("Delete this scenario?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      if (selected?.id === id) setSelected(null);
      fetchScenarios();
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  }

  const maxDelta = selected ? Math.max(...selected.projections.map(p => Math.abs(p.delta)), 1) : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Scenario Modeling</h1>
          <p className="text-muted-foreground">Model business assumptions and project cash flow impact</p>
        </div>
        <Button onClick={() => { setShowDialog(true); setForm({ name: "", description: "", newHires: "", avgSalary: "", revenueGrowth: "", cogs: "", opexChange: "", marketingSpend: "" }); }} className="gap-2">
          <Plus className="h-4 w-4" />New Scenario
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saved Scenarios</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : scenarios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No scenarios yet. Create one to model business assumptions.</p>
              </CardContent>
            </Card>
          ) : (
            scenarios.map(s => (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors ${selected?.id === s.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}
                onClick={() => setSelected(s)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); deleteScenario(s.id); }}
                      disabled={deleting === s.id}
                    >
                      {deleting === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Scenario detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a scenario to view projections</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />{selected.name}
                  </CardTitle>
                  {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.assumptions).map(([key, val]) => {
                      const info = DEFAULT_ASSUMPTIONS.find(a => a.key === key);
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {info?.label || key}: {val}{info?.unit === "%" ? "%" : info?.unit === "$/yr" || info?.unit === "$/mo" ? ` ${info.unit}` : ""}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {selected.summary && (
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" />AI Analysis</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{selected.summary}</p></CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">12-Month Cash Flow Projection</CardTitle></CardHeader>
                <CardContent>
                  {/* Visual bar chart */}
                  <div className="space-y-2 mb-6">
                    {selected.projections.map((p, i) => {
                      const isPositive = p.delta >= 0;
                      const barWidth = Math.abs(p.delta) / maxDelta * 100;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-16 text-xs text-muted-foreground shrink-0">{p.month}</span>
                          <div className="flex-1 flex items-center gap-1">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-20 text-right text-xs font-mono">{fmt(p.baseline)}</span>
                          <span className="w-20 text-right text-xs font-mono">{fmt(p.projected)}</span>
                          <span className={`w-16 text-right text-xs font-mono font-medium flex items-center justify-end gap-1 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {fmtPct(p.projected !== 0 ? (p.delta / Math.abs(p.projected - p.delta)) * 100 : 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-1"><div className="h-2 w-4 bg-muted rounded" />Baseline</div>
                    <div className="flex items-center gap-1"><div className="h-2 w-4 bg-emerald-500 rounded" />Scenario (positive)</div>
                    <div className="flex items-center gap-1"><div className="h-2 w-4 bg-red-500 rounded" />Scenario (negative)</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Detailed Comparison</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Baseline</TableHead>
                        <TableHead className="text-right">Projected</TableHead>
                        <TableHead className="text-right">Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.projections.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{p.month}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(p.baseline)}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(p.projected)}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${p.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {p.delta >= 0 ? "+" : ""}{fmt(p.delta)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{fmt(selected.projections.reduce((s, p) => s + p.baseline, 0))}</TableCell>
                        <TableCell className="text-right">{fmt(selected.projections.reduce((s, p) => s + p.projected, 0))}</TableCell>
                        <TableCell className={`text-right ${selected.projections.reduce((s, p) => s + p.delta, 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {selected.projections.reduce((s, p) => s + p.delta, 0) >= 0 ? "+" : ""}
                          {fmt(selected.projections.reduce((s, p) => s + p.delta, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />New Scenario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Scenario Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aggressive hiring plan Q3" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the business scenario..." rows={2} />
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Assumptions</p>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_ASSUMPTIONS.map(({ key, label, placeholder, unit }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label} <span className="text-muted-foreground">({unit})</span></Label>
                    <Input
                      type="number"
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={runScenario} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {running ? "Running AI..." : "Generate Scenario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
