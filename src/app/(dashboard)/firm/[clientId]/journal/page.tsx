"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, BookOpen, Trash2, Loader2 } from "lucide-react";

interface Account {
  id: string; code: string; name: string; type: string;
}
interface Line {
  id: string; accountId: string;
  account?: { id: string; code: string; name: string; type: string };
  debit: number; credit: number; description: string | null;
}
interface JE {
  id: string; entryNumber: string; date: string; description: string;
  memo: string | null; reference: string | null; status: string; type: string;
  lines: Line[];
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function JournalPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [entries, setEntries] = useState<JE[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  type LineDraft = { accountId: string; debit: string; credit: string; description: string };
  const [form, setForm] = useState<{
    date: string; description: string; memo: string; reference: string; lines: LineDraft[];
  }>({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    memo: "",
    reference: "",
    lines: [
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" },
    ],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/journal?clientId=${clientId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries ?? []);
      setAccounts(data.accounts ?? []);
    } catch {
      toast.error("Failed to load journal");
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function updateLine(i: number, field: keyof LineDraft, value: string) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, j) => (i === j ? { ...l, [field]: value } : l)),
    }));
  }
  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, { accountId: "", debit: "", credit: "", description: "" }] }));
  }
  function removeLine(i: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  }

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  async function save() {
    if (!balanced) {
      toast.error("Entry must balance (debits = credits)");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/firm/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          date: form.date,
          description: form.description,
          memo: form.memo || undefined,
          reference: form.reference || undefined,
          lines: form.lines
            .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
            .map((l) => ({
              accountId: l.accountId,
              debit: parseFloat(l.debit) || 0,
              credit: parseFloat(l.credit) || 0,
              description: l.description || undefined,
            })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      toast.success("Journal entry posted");
      setOpen(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        description: "", memo: "", reference: "",
        lines: [
          { accountId: "", debit: "", credit: "", description: "" },
          { accountId: "", debit: "", credit: "", description: "" },
        ],
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Link href={`/firm/${clientId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        <ArrowLeft className="h-3 w-3" /> back to workspace
      </Link>

      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> firm / journal_entries
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Journal entries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manual adjustments — accruals, deferrals, depreciation, corrections. Double-entry, balanced.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={accounts.length === 0} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New entry
        </Button>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-4 text-sm">
          <p className="font-semibold text-amber-400">Chart of accounts is empty for this client.</p>
          <p className="text-muted-foreground mt-1">Set up the chart of accounts before posting journal entries.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No journal entries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click &ldquo;New entry&rdquo; to post the first adjustment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const td = e.lines.reduce((s, l) => s + l.debit, 0);
            return (
              <li key={e.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.description}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {e.entryNumber} · {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {e.type.toLowerCase()}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 px-2 py-0.5 rounded">
                    {e.status.toLowerCase()}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="text-left py-1.5 font-mono text-[10px] uppercase tracking-wider">account</th>
                      <th className="text-right py-1.5 font-mono text-[10px] uppercase tracking-wider">debit</th>
                      <th className="text-right py-1.5 font-mono text-[10px] uppercase tracking-wider">credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {e.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{l.account?.code ?? "—"}</span>
                          <span className="ml-2">{l.account?.name ?? "—"}</span>
                          {l.description && <span className="ml-2 text-xs text-muted-foreground">· {l.description}</span>}
                        </td>
                        <td className="text-right font-mono text-sm py-1.5">{l.debit > 0 ? fmt(l.debit) : ""}</td>
                        <td className="text-right font-mono text-sm py-1.5">{l.credit > 0 ? fmt(l.credit) : ""}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border/60 font-semibold">
                      <td className="py-1.5 font-mono text-[10px] uppercase">total</td>
                      <td className="text-right font-mono text-sm py-1.5">{fmt(td)}</td>
                      <td className="text-right font-mono text-sm py-1.5">{fmt(td)}</td>
                    </tr>
                  </tbody>
                </table>
                {e.memo && (
                  <p className="text-xs text-muted-foreground mt-3 italic">Memo: {e.memo}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* New entry dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
            <DialogDescription>Manual adjustment. Debits must equal credits.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="je-date">Date</Label>
                <Input id="je-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="je-ref">Reference</Label>
                <Input id="je-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="je-desc">Description *</Label>
              <Input id="je-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. March depreciation" />
            </div>

            <div className="space-y-2">
              <Label>Lines</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={l.accountId}
                    onChange={(e) => updateLine(i, "accountId", e.target.value)}
                    className="col-span-5 h-9 border border-input bg-background rounded-md px-2 text-sm"
                  >
                    <option value="">— account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                    ))}
                  </select>
                  <Input
                    className="col-span-2"
                    placeholder="0.00"
                    value={l.debit}
                    onChange={(e) => updateLine(i, "debit", e.target.value)}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="0.00"
                    value={l.credit}
                    onChange={(e) => updateLine(i, "credit", e.target.value)}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="memo"
                    value={l.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                  />
                  <button onClick={() => removeLine(i)} disabled={form.lines.length <= 2} className="col-span-1 text-muted-foreground hover:text-rose-400 disabled:opacity-30">
                    <Trash2 className="h-3.5 w-3.5 mx-auto" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
            </div>

            <div className="rounded-md border border-border/60 bg-background p-3 grid grid-cols-3 gap-3 text-sm font-mono">
              <div><span className="text-muted-foreground">debits </span><span className="font-semibold">{fmt(totalDebit)}</span></div>
              <div><span className="text-muted-foreground">credits </span><span className="font-semibold">{fmt(totalCredit)}</span></div>
              <div className={`${balanced ? "text-emerald-400" : "text-rose-400"}`}>
                {balanced ? "✓ balanced" : `diff ${fmt(Math.abs(totalDebit - totalCredit))}`}
              </div>
            </div>

            <div>
              <Label htmlFor="je-memo">Memo</Label>
              <Textarea id="je-memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} rows={2} placeholder="Optional context for the auditor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !balanced || !form.description.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {saving ? "Posting..." : "Post entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
