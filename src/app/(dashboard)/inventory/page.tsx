"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Package, AlertTriangle, ChevronRight } from "lucide-react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unitOfMeasure: string;
  costMethod: string;
  costPrice: number;
  sellPrice: number;
  quantityOnHand: number;
  reorderPoint: number | null;
  isActive: boolean;
  _count: { movements: number };
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", description: "", category: "", unitOfMeasure: "EACH", costMethod: "FIFO", costPrice: "", sellPrice: "", quantityOnHand: "0", reorderPoint: "", reorderQty: "" });

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      setItems(await res.json());
    } catch { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchItems(); }, []);

  async function handleCreate() {
    if (!form.sku || !form.name) { toast.error("SKU and name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Item created");
      setShowDialog(false);
      fetchItems();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const totalValue = items.reduce((s, i) => s + i.quantityOnHand * i.costPrice, 0);
  const lowStock = items.filter(i => i.reorderPoint !== null && i.quantityOnHand <= i.reorderPoint);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels, movements, and COGS</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Item</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{items.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalValue)}</p></CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {lowStock.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent><p className={`text-2xl font-bold ${lowStock.length > 0 ? "text-amber-600" : ""}`}>{lowStock.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active SKUs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{items.filter(i => i.isActive).length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Inventory Items</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No inventory items yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Qty on Hand</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const isLow = item.reorderPoint !== null && item.quantityOnHand <= item.reorderPoint;
                  return (
                    <TableRow key={item.id} className={isLow ? "bg-amber-50 dark:bg-amber-900/10" : ""}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.sku}</code></TableCell>
                      <TableCell className="font-medium">
                        {item.name}
                        {isLow && <Badge className="ml-2 text-xs bg-amber-100 text-amber-800">Low Stock</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.category || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{item.costMethod}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${isLow ? "text-amber-600" : ""}`}>{item.quantityOnHand} {item.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">{fmt(item.costPrice)}</TableCell>
                      <TableCell className="text-right">{fmt(item.sellPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.quantityOnHand * item.costPrice)}</TableCell>
                      <TableCell>
                        <Link href={`/inventory/${item.id}`}><Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button></Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="PROD-001" /></div>
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Electronics" /></div>
              <div className="space-y-1"><Label>Unit</Label><Select value={form.unitOfMeasure} onValueChange={v => setForm(f => ({ ...f, unitOfMeasure: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EACH">Each</SelectItem><SelectItem value="BOX">Box</SelectItem><SelectItem value="KG">KG</SelectItem><SelectItem value="LB">LB</SelectItem><SelectItem value="LITER">Liter</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cost Method</Label><Select value={form.costMethod} onValueChange={v => setForm(f => ({ ...f, costMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FIFO">FIFO</SelectItem><SelectItem value="LIFO">LIFO</SelectItem><SelectItem value="WEIGHTED_AVG">Weighted Avg</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Initial Qty</Label><Input type="number" value={form.quantityOnHand} onChange={e => setForm(f => ({ ...f, quantityOnHand: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cost Price</Label><Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="10.00" /></div>
              <div className="space-y-1"><Label>Sell Price</Label><Input type="number" step="0.01" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} placeholder="15.00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Reorder Point</Label><Input type="number" value={form.reorderPoint} onChange={e => setForm(f => ({ ...f, reorderPoint: e.target.value }))} placeholder="10" /></div>
              <div className="space-y-1"><Label>Reorder Qty</Label><Input type="number" value={form.reorderQty} onChange={e => setForm(f => ({ ...f, reorderQty: e.target.value }))} placeholder="50" /></div>
            </div>
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
