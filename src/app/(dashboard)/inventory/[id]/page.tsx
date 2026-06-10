"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, ArrowLeft, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

interface Movement { id: string; date: string; type: string; quantity: number; unitCost: number; totalCost: number; reference: string | null; notes: string | null }
interface Item { id: string; sku: string; name: string; category: string | null; costMethod: string; costPrice: number; sellPrice: number; quantityOnHand: number; unitOfMeasure: string; reorderPoint: number | null; isActive: boolean; movements: Movement[] }

const typeColors: Record<string, string> = {
  PURCHASE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  SALE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ADJUSTMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  TRANSFER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fmt } = useLocale();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], type: "PURCHASE", quantity: "", unitCost: "", reference: "", notes: "" });

  async function fetchItem() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${id}`);
      setItem(await res.json());
    } catch { toast.error("Failed to load item"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchItem(); }, [id]);

  async function addMovement() {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${id}/movements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Movement recorded");
      setShowDialog(false);
      fetchItem();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!item) return <div className="p-6 text-muted-foreground">Item not found</div>;

  const totalPurchased = item.movements.filter(m => m.type === "PURCHASE").reduce((s, m) => s + m.quantity, 0);
  const totalSold = item.movements.filter(m => m.type === "SALE").reduce((s, m) => s + m.quantity, 0);
  const avgCost = item.movements.length > 0 ? item.movements.reduce((s, m) => s + m.unitCost, 0) / item.movements.length : item.costPrice;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/inventory"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground">SKU: {item.sku} · {item.costMethod}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">On Hand</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{item.quantityOnHand} {item.unitOfMeasure}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(item.quantityOnHand * item.costPrice)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gross Margin</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{item.sellPrice > 0 ? (((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1) : "0"}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Movements</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{item.movements.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="flex justify-between"><span className="text-muted-foreground">Cost Price</span><span className="font-medium">{fmt(item.costPrice)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Sell Price</span><span className="font-medium">{fmt(item.sellPrice)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Avg Cost</span><span className="font-medium">{fmt(avgCost)}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="flex justify-between"><span className="text-muted-foreground">Total Purchased</span><span className="font-medium">{totalPurchased}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Total Sold</span><span className="font-medium">{totalSold}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Net</span><span className="font-medium">{totalPurchased - totalSold}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="flex justify-between"><span className="text-muted-foreground">Reorder Point</span><span className="font-medium">{item.reorderPoint ?? "—"}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Cost Method</span><span className="font-medium">{item.costMethod}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Movement History</CardTitle>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1"><Plus className="h-3.5 w-3.5" />Add Movement</Button>
        </CardHeader>
        <CardContent>
          {item.movements.length === 0 ? <p className="text-center text-muted-foreground py-4">No movements yet</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
              <TableBody>
                {item.movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={typeColors[m.type] || ""}>{m.type}</Badge></TableCell>
                    <TableCell className="text-right">{m.type === "SALE" ? "-" : "+"}{m.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(m.unitCost)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(m.totalCost)}</TableCell>
                    <TableCell className="text-muted-foreground">{m.reference || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Movement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label><Select value={form.type} onValueChange={(v: string | null) => setForm(f => ({ ...f, type: v ?? '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PURCHASE">Purchase</SelectItem><SelectItem value="SALE">Sale</SelectItem><SelectItem value="ADJUSTMENT">Adjustment</SelectItem><SelectItem value="TRANSFER">Transfer</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="10" /></div>
              <div className="space-y-1"><Label>Unit Cost</Label><Input type="number" step="0.01" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} placeholder={String(item.costPrice)} /></div>
            </div>
            <div className="space-y-1"><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="PO-001" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addMovement} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
