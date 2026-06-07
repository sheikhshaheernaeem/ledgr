"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

interface LineItem { description: string; quantity: string; unitPrice: string; }
interface Invoice { id: string; invoiceNumber: string; clientName: string; total: number; }

export default function NewCreditNotePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    relatedInvoiceId: "",
    issueDate: new Date().toISOString().split("T")[0],
    notes: "",
    taxRate: "0",
  });

  useEffect(() => {
    fetch("/api/invoices?status=PAID&status=SENT&pageSize=100")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? d))
      .catch(() => {});
  }, []);

  function updateItem(i: number, field: keyof LineItem, val: string) {
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0), 0);
  const taxAmount = subtotal * ((parseFloat(form.taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: parseFloat(form.taxRate) || 0,
          lineItems: items.filter((it) => it.description).map((it) => ({
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unitPrice: parseFloat(it.unitPrice) || 0,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Credit note created");
      router.push("/credit-notes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/credit-notes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Credit Note</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Related Invoice (optional)</Label>
              <Select value={form.relatedInvoiceId} onValueChange={(v) => {
                const val = v ?? "";
                const inv = invoices.find((i) => i.id === val);
                setForm((p) => ({ ...p, relatedInvoiceId: val, clientName: inv?.clientName ?? p.clientName }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an invoice to credit" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.clientName} (${inv.total.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate %</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <Textarea placeholder="Reason for the credit note..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Items Being Credited</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, { description: "", quantity: "1", unitPrice: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6 space-y-1">
                  {i === 0 && <Label className="text-xs">Description</Label>}
                  <Input placeholder="Item description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs">Qty</Label>}
                  <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label className="text-xs">Unit Price</Label>}
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-400" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {parseFloat(form.taxRate) > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({form.taxRate}%)</span><span>${taxAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-semibold text-red-400 text-base"><span>Credit Total</span><span>(${total.toFixed(2)})</span></div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Credit Note
        </Button>
      </form>
    </div>
  );
}
