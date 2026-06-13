"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Repeat, Plus, Trash2, Loader2, Sparkles } from "lucide-react";

interface Rule {
  id: string;
  keyword: string;
  matchType: string;
  category: string;
  subcategory: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = [
  "Revenue", "Sales", "Software & SaaS", "Marketing", "Advertising",
  "Travel", "Meals", "Office Supplies", "Insurance", "Legal & Professional",
  "Bank Fees", "Salaries & Wages", "Contractors", "Rent", "Utilities",
  "Equipment", "Repairs", "Taxes", "Interest", "Other Income", "Other Expense",
];

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ keyword: "", category: "Software & SaaS", subcategory: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client/rules");
      if (!res.ok) throw new Error();
      setRules(await res.json());
    } catch {
      toast.error("Failed to load");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.keyword.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/client/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Rule saved — future matches auto-categorize");
      setForm({ keyword: "", category: "Software & SaaS", subcategory: "" });
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/client/rules?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Repeat className="h-3 w-3" /> categorization_rules
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Recurring rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell your firm how to categorize specific vendors. Less back-and-forth, faster close.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New rule
        </Button>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">How rules work</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Any transaction whose description contains your keyword auto-classifies to the category you pick.
              Example: keyword <span className="font-mono text-foreground">stripe</span> → category{" "}
              <span className="font-mono text-foreground">Revenue</span> means every Stripe payout is logged as revenue automatically.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <Repeat className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first rule for vendors like Netflix, Stripe, AWS, etc.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm">
                  When description contains{" "}
                  <span className="font-mono text-foreground bg-background border border-border px-1.5 py-0.5 rounded text-xs">
                    {r.keyword}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  → categorize as <span className="text-emerald-400 font-medium">{r.category}</span>
                  {r.subcategory && ` (${r.subcategory})`}
                </p>
              </div>
              <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-rose-400 w-7 h-7 rounded-md hover:bg-card flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New categorization rule</DialogTitle>
            <DialogDescription>Auto-classify future transactions from this vendor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3 py-2">
            <div>
              <Label htmlFor="r-kw">Keyword in description</Label>
              <Input id="r-kw" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="e.g. stripe, netflix, aws" required autoFocus />
              <p className="text-[11px] text-muted-foreground font-mono mt-1">case-insensitive · contains match</p>
            </div>
            <div>
              <Label htmlFor="r-cat">Category</Label>
              <select id="r-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="r-sub">Subcategory (optional)</Label>
              <Input id="r-sub" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="e.g. cloud hosting" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "Saving..." : "Save rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
