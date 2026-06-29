"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface LineItem { date: string; description: string; category: string; amount: string; }

const CATEGORIES = [
  "Travel", "Meals & Entertainment", "Office Supplies", "Software & Subscriptions",
  "Equipment", "Professional Services", "Marketing", "Utilities", "Other",
];

export default function NewExpenseClaimPage() {
  const router = useRouter();
  const [saving, setSaving] = useState<"" | "DRAFT" | "SUBMITTED">("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [items, setItems] = useState<LineItem[]>([
    { date: today, description: "", category: "Travel", amount: "" },
  ]);

  function updateItem(i: number, field: keyof LineItem, val: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function addItem() {
    setItems(p => [...p, { date: today, description: "", category: "Other", amount: "" }]);
  }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }

  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  async function submit(status: "DRAFT" | "SUBMITTED") {
    if (!description.trim()) return toast.error("Add a claim description");
    const validItems = items.filter(it => it.description.trim() && (parseFloat(it.amount) || 0) > 0);
    if (validItems.length === 0) return toast.error("Add at least one line item with a description and amount");
    setSaving(status);
    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          notes: notes.trim() || undefined,
          status,
          items: validItems.map(it => ({
            date: it.date,
            description: it.description.trim(),
            category: it.category || undefined,
            amount: parseFloat(it.amount) || 0,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      toast.success(status === "SUBMITTED" ? "Claim submitted" : "Draft saved");
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create claim");
    } finally {
      setSaving("");
    }
  }

  const busy = saving !== "";

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-foreground">New Expense Claim</h1>
      </div>

      <form onSubmit={e => { e.preventDefault(); submit("SUBMITTED"); }} className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Claim Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                placeholder="e.g. Client trip to San Francisco — March"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={2}
                placeholder="Business purpose, approver, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
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
              <div className="col-span-3">Date</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-3 text-sm" type="date" value={item.date} onChange={e => updateItem(i, "date", e.target.value)} />
                <Input className="col-span-4 text-sm" placeholder="Expense description" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                <select
                  className="col-span-3 rounded-md border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={item.category}
                  onChange={e => updateItem(i, "category", e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input className="col-span-1 text-sm text-right" type="number" min="0" step="0.01" placeholder="0.00" value={item.amount} onChange={e => updateItem(i, "amount", e.target.value)} />
                <Button type="button" variant="ghost" size="sm" className="col-span-1 px-1" onClick={() => removeItem(i)} disabled={items.length === 1}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-end gap-8 font-bold text-foreground text-base">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/expenses"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="button" variant="outline" disabled={busy} onClick={() => submit("DRAFT")}>
            {saving === "DRAFT" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
          </Button>
          <Button type="submit" disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
            {saving === "SUBMITTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Claim"}
          </Button>
        </div>
      </form>
    </div>
  );
}
