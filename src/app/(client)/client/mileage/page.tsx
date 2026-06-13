"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Car, Plus, Trash2, Loader2 } from "lucide-react";

interface Entry {
  id: string;
  date: string;
  description: string;
  fromAddress: string | null;
  toAddress: string | null;
  miles: number;
  ratePerMile: number;
  amount: number;
  purpose: string;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MileagePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    fromAddress: "",
    toAddress: "",
    miles: "",
    ratePerMile: "0.67",
    purpose: "BUSINESS",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client/mileage");
      if (!res.ok) throw new Error();
      setEntries(await res.json());
    } catch {
      toast.error("Failed to load");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.miles || !form.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/client/mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          miles: parseFloat(form.miles),
          ratePerMile: parseFloat(form.ratePerMile),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mileage logged");
      setForm({
        date: new Date().toISOString().slice(0, 10),
        description: "", fromAddress: "", toAddress: "",
        miles: "", ratePerMile: "0.67", purpose: "BUSINESS",
      });
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/client/mileage?id=${id}`, { method: "DELETE" });
    load();
  }

  const totalMiles = entries.reduce((s, e) => s + e.miles, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const ytdEntries = entries.filter((e) => new Date(e.date).getFullYear() === new Date().getFullYear());
  const ytdMiles = ytdEntries.reduce((s, e) => s + e.miles, 0);
  const ytdAmount = ytdEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Car className="h-3 w-3" /> mileage
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Mileage tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log business miles. IRS rate {fmt(0.67)}/mile. Auto-included in your tax deductions.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Log trip
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="ytd_miles" value={ytdMiles.toFixed(0)} />
        <Stat label="ytd_deduction" value={fmt(ytdAmount)} color="text-emerald-400" />
        <Stat label="total_miles" value={totalMiles.toFixed(0)} />
        <Stat label="total_deduction" value={fmt(totalAmount)} color="text-emerald-400" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <Car className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No trips logged</p>
          <p className="text-sm text-muted-foreground mt-1">Click &ldquo;Log trip&rdquo; to start tracking business miles.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border/60 text-left">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">date</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">description</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">from → to</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">miles</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">deduction</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-card/30">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 text-sm">{e.description}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {e.fromAddress || "—"} → {e.toAddress || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm">{e.miles.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-emerald-400">{fmt(e.amount)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-rose-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a business trip</DialogTitle>
            <DialogDescription>Tax-deductible at the IRS standard mileage rate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-date">Date</Label>
                <Input id="m-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="m-miles">Miles</Label>
                <Input id="m-miles" type="number" step="0.1" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} placeholder="0" required />
              </div>
            </div>
            <div>
              <Label htmlFor="m-desc">What for?</Label>
              <Input id="m-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Client meeting in SF" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-from">From</Label>
                <Input id="m-from" value={form.fromAddress} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label htmlFor="m-to">To</Label>
                <Input id="m-to" value={form.toAddress} onChange={(e) => setForm({ ...form, toAddress: e.target.value })} placeholder="optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="m-rate">Rate per mile</Label>
              <Input id="m-rate" type="number" step="0.01" value={form.ratePerMile} onChange={(e) => setForm({ ...form, ratePerMile: e.target.value })} />
              <p className="text-[11px] text-muted-foreground font-mono mt-1">IRS 2026 standard rate: $0.67/mile</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "Saving..." : "Log trip"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
