"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  accountCode: string;
}

export default function NewBillPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [autoNumber, setAutoNumber] = useState(false);
  const [form, setForm] = useState({
    billNumber: "",
    vendorName: "",
    vendorEmail: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    taxRate: "0",
    notes: "",
    category: "",
    currency: "USD",
  });
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "", accountCode: "" },
  ]);

  useEffect(() => {
    fetch("/api/bills/next-number")
      .then(r => r.json())
      .then(d => {
        setForm(p => ({ ...p, billNumber: d.billNumber ?? "" }));
        setAutoNumber(true);
      })
      .catch(() => {});
  }, []);

  function updateItem(i: number, field: keyof LineItem, val: string) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
  }
  function addItem() {
    setItems(p => [...p, { description: "", quantity: "1", unitPrice: "", accountCode: "" }]);
  }
  function removeItem(i: number) {
    setItems(p => p.filter((_, idx) => idx !== i));
  }

  const subtotal = items.reduce(
    (s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0),
    0
  );
  const taxRate = parseFloat(form.taxRate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function saveBill(status: string) {
    if (items.every(it => !it.description)) return toast.error("Add at least one line item");
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: parseFloat(form.taxRate) || 0,
          status,
          lineItems: items.filter(it => it.description).map(it => ({
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unitPrice: parseFloat(it.unitPrice) || 0,
            accountCode: it.accountCode || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      toast.success("Bill created");
      router.push("/bills");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bills">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Bill</h1>
      </div>

      <form className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                placeholder="Acme Supplies"
                value={form.vendorName}
                onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor Email</Label>
              <Input
                type="email"
                placeholder="accounts@supplier.com"
                value={form.vendorEmail}
                onChange={e => setForm(p => ({ ...p, vendorEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Bill Number *
                {autoNumber && (
                  <Badge
                    variant="outline"
                    className="text-xs font-normal px-1.5 py-0 border-emerald-500/40 text-emerald-400"
                  >
                    (auto)
                  </Badge>
                )}
              </Label>
              <Input
                value={form.billNumber}
                onChange={e => {
                  setForm(p => ({ ...p, billNumber: e.target.value }));
                  setAutoNumber(false);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.taxRate}
                onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                required
              />
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
              <Label>Category</Label>
              <Input
                placeholder="e.g. Office Supplies, Software, Utilities"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
              <Plus className="h-3 w-3" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Unit Price</div>
              <div className="col-span-2">Account Code</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-4 text-sm"
                  placeholder="Item description"
                  value={item.description}
                  onChange={e => updateItem(i, "description", e.target.value)}
                />
                <Input
                  className="col-span-2 text-sm text-center"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={e => updateItem(i, "quantity", e.target.value)}
                />
                <Input
                  className="col-span-2 text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={e => updateItem(i, "unitPrice", e.target.value)}
                />
                <Input
                  className="col-span-2 text-sm"
                  placeholder="e.g. 5000"
                  value={item.accountCode}
                  onChange={e => updateItem(i, "accountCode", e.target.value)}
                />
                <div className="col-span-1 text-right text-sm font-medium">
                  ${(
                    (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                  ).toFixed(2)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="col-span-1 px-1"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="space-y-1 text-sm text-right">
              <div className="flex justify-end gap-8 text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-end gap-8 text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span>${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-end gap-8 font-bold text-foreground text-base">
                <span>Total</span>
                <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4 space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={3}
              placeholder="Payment terms, reference numbers, etc."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/bills">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => saveBill("DRAFT")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            onClick={() => saveBill("PENDING")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Pending"}
          </Button>
        </div>
      </form>
    </div>
  );
}
