"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface LineItem { description: string; quantity: string; unitPrice: string; discount: string; }

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [autoNumber, setAutoNumber] = useState(false);
  const [form, setForm] = useState({
    invoiceNumber: "",
    clientName: "",
    clientEmail: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    taxRate: "0",
    lateFeePct: "0",
    notes: "",
    isRecurring: false,
    recurringInterval: "monthly",
    currency: "USD",
    poNumber: "",
  });
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "", discount: "0" }]);

  useEffect(() => {
    fetch("/api/invoices/next-number")
      .then(r => r.json())
      .then(d => {
        setForm(p => ({ ...p, invoiceNumber: d.invoiceNumber ?? "" }));
        setAutoNumber(true);
      })
      .catch(() => {});
  }, []);

  function updateItem(i: number, field: keyof LineItem, val: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function addItem() { setItems(p => [...p, { description: "", quantity: "1", unitPrice: "", discount: "0" }]); }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    const disc = parseFloat(it.discount) || 0;
    return s + qty * price * (1 - disc / 100);
  }, 0);
  const discountAmount = items.reduce((s, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    const disc = parseFloat(it.discount) || 0;
    return s + qty * price * (disc / 100);
  }, 0);
  const taxRate = parseFloat(form.taxRate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.every(it => !it.description)) return toast.error("Add at least one line item");
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: parseFloat(form.taxRate) || 0,
          lateFeePct: parseFloat(form.lateFeePct) || 0,
          isRecurring: form.isRecurring,
          recurringInterval: form.isRecurring ? form.recurringInterval : undefined,
          poNumber: form.poNumber || undefined,
          lineItems: items.filter(it => it.description).map(it => ({
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unitPrice: parseFloat(it.unitPrice) || 0,
            discount: parseFloat(it.discount) || 0,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast.success("Invoice created");
      router.push("/invoices");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/invoices"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input placeholder="Acme Corp" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input type="email" placeholder="billing@acme.com" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Invoice Number *
                {autoNumber && <Badge variant="outline" className="text-xs font-normal px-1.5 py-0 border-emerald-500/40 text-emerald-400">(auto)</Badge>}
              </Label>
              <Input value={form.invoiceNumber} onChange={e => { setForm(p => ({ ...p, invoiceNumber: e.target.value })); setAutoNumber(false); }} required />
            </div>
            <div className="space-y-2">
              <Label>PO Number (optional)</Label>
              <Input
                placeholder="e.g. PO-2024-001"
                value={form.poNumber}
                onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PKR">PKR (₨)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Late Fee (%/month)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="0"
                value={form.lateFeePct}
                onChange={e => setForm(p => ({ ...p, lateFeePct: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Applied when invoice becomes overdue (0 = no late fee)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2"><Plus className="h-3 w-3" />Add Row</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Unit Price</div>
              <div className="col-span-1 text-center">Disc %</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4 text-sm" placeholder="Service description" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                <Input className="col-span-2 text-sm text-center" type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
                <Input className="col-span-2 text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} />
                <Input className="col-span-1 text-sm text-center" type="number" min="0" max="100" step="0.1" placeholder="0" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)} />
                <div className="col-span-2 text-right text-sm font-medium">
                  ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * (1 - (parseFloat(item.discount) || 0) / 100)).toFixed(2)}
                </div>
                <Button type="button" variant="ghost" size="sm" className="col-span-1 px-1" onClick={() => removeItem(i)} disabled={items.length === 1}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="space-y-1 text-sm text-right">
              {discountAmount > 0 && (
                <div className="flex justify-end gap-8 text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span>${(subtotal + discountAmount).toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-end gap-8 text-red-400">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-end gap-8 text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {taxRate > 0 && <div className="flex justify-end gap-8 text-muted-foreground"><span>Tax ({taxRate}%)</span><span>${taxAmount.toFixed(2)}</span></div>}
              <div className="flex justify-end gap-8 font-bold text-foreground text-base"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4 space-y-2">
            <Label>Notes</Label>
            <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500" rows={3} placeholder="Payment terms, bank details, etc." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Recurring</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={form.isRecurring}
                onChange={e => setForm(p => ({ ...p, isRecurring: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">Recurring invoice</Label>
            </div>
            {form.isRecurring && (
              <div className="space-y-2">
                <Label>Recurrence Interval</Label>
                <select
                  value={form.recurringInterval}
                  onChange={e => setForm(p => ({ ...p, recurringInterval: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/invoices"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
