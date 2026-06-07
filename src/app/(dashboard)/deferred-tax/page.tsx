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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Calculator, Trash2 } from "lucide-react";

interface DeferredTaxItem { id: string; name: string; type: string; description: string | null; bookValue: number; taxValue: number; temporaryDiff: number; taxRate: number; deferredAmount: number; period: string }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function DeferredTaxPage() {
  const [data, setData] = useState<{ items: DeferredTaxItem[]; totals: { totalAssets: number; totalLiabilities: number }; netDeferredTax: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "ASSET", description: "", bookValue: "", taxValue: "", taxRate: "0.21", period: new Date().toISOString().split("T")[0].slice(0, 7) + "-01" });

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/deferred-tax");
      setData(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.name || !form.bookValue || !form.taxValue) { toast.error("Required fields missing"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/deferred-tax", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Item created");
      setShowDialog(false);
      fetchData();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`/api/deferred-tax/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchData();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deferred Tax Schedule</h1>
          <p className="text-muted-foreground">Track temporary differences and deferred tax assets/liabilities</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Item</Button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deferred Tax Assets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(data.totals.totalAssets)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deferred Tax Liabilities</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{fmt(data.totals.totalLiabilities)}</p></CardContent>
          </Card>
          <Card className={data.netDeferredTax >= 0 ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Deferred Tax</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${data.netDeferredTax >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(data.netDeferredTax)}</p></CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Temporary Differences</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No deferred tax items. Add temporary differences between book and tax values.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Tax Value</TableHead>
                  <TableHead className="text-right">Temp Diff</TableHead>
                  <TableHead className="text-right">Tax Rate</TableHead>
                  <TableHead className="text-right">Deferred Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant={item.type === "ASSET" ? "default" : "destructive"}>{item.type}</Badge></TableCell>
                    <TableCell className="text-right">{fmt(item.bookValue)}</TableCell>
                    <TableCell className="text-right">{fmt(item.taxValue)}</TableCell>
                    <TableCell className={`text-right font-medium ${item.temporaryDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(item.temporaryDiff)}</TableCell>
                    <TableCell className="text-right">{(item.taxRate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-bold">{fmt(item.deferredAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Deferred Tax Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Accelerated depreciation" /></div>
              <div className="space-y-1"><Label>Type</Label><Select value={form.type} onValueChange={(v: string) => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ASSET">Deferred Tax Asset</SelectItem><SelectItem value="LIABILITY">Deferred Tax Liability</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Book Value *</Label><Input type="number" value={form.bookValue} onChange={e => setForm(f => ({ ...f, bookValue: e.target.value }))} placeholder="100000" /></div>
              <div className="space-y-1"><Label>Tax Value *</Label><Input type="number" value={form.taxValue} onChange={e => setForm(f => ({ ...f, taxValue: e.target.value }))} placeholder="80000" /></div>
              <div className="space-y-1"><Label>Tax Rate</Label><Input type="number" step="0.01" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="0.21" /></div>
            </div>
            <div className="space-y-1"><Label>Period</Label><Input type="date" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
