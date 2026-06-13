"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wand2, Loader2, Search } from "lucide-react";

interface Tx {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string | null;
  status: string;
}

const CATEGORIES = [
  "Revenue", "Sales", "Refunds",
  "Cost of Goods Sold", "Salaries & Wages", "Contractors",
  "Rent", "Utilities", "Software & SaaS", "Marketing", "Advertising",
  "Travel", "Meals", "Office Supplies", "Insurance", "Legal & Professional",
  "Bank Fees", "Interest", "Taxes", "Equipment", "Repairs",
  "Other Income", "Other Expense",
];

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BulkCategorizePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [txns, setTxns] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("");
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [saveRule, setSaveRule] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"uncategorized" | "all">("uncategorized");
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/managed-clients/${clientId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTxns(data.transactions ?? []);
    } catch {
      toast.error("Failed to load transactions");
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filter === "uncategorized" && t.category && t.category !== "Uncategorized") return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txns, search, filter]);

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.id)));
    }
  }

  // Auto-suggest a rule keyword from common words in selected descriptions
  const suggestedKeyword = useMemo(() => {
    if (selected.size === 0) return "";
    const descs = txns.filter((t) => selected.has(t.id)).map((t) => t.description.toLowerCase());
    if (descs.length === 0) return "";
    // Find common word (>=4 chars) appearing in most selected
    const wordCount = new Map<string, number>();
    for (const d of descs) {
      const words = d.match(/[a-z]{4,}/g) ?? [];
      const unique = new Set(words);
      for (const w of unique) wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
    }
    const best = [...wordCount.entries()].sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= Math.ceil(descs.length / 2) ? best[0] : "";
  }, [selected, txns]);

  useEffect(() => {
    if (suggestedKeyword && !ruleKeyword) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRuleKeyword(suggestedKeyword);
    }
  }, [suggestedKeyword, ruleKeyword]);

  async function apply() {
    if (!category || selected.size === 0) {
      toast.error("Select transactions and a category");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/firm/bulk-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          transactionIds: [...selected],
          category,
          saveRule: saveRule && !!ruleKeyword.trim(),
          ruleKeyword: ruleKeyword.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(
        `Updated ${data.updatedCount} txns${data.ruleCreated ? ` · Rule saved for "${data.ruleCreated.keyword}"` : ""}`
      );
      setSelected(new Set());
      setCategory("");
      setRuleKeyword("");
      setSaveRule(false);
      load();
    } catch {
      toast.error("Failed to update");
    } finally { setApplying(false); }
  }

  return (
    <div className="space-y-6">
      <Link href={`/firm/${clientId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        <ArrowLeft className="h-3 w-3" /> back to workspace
      </Link>

      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Wand2 className="h-3 w-3" /> firm / bulk_categorize
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Bulk categorize</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select many similar transactions, assign one category, optionally save a rule for next time.
        </p>
      </div>

      {/* Action bar — sticky */}
      <div className="sticky top-0 z-10 rounded-lg border border-border/60 bg-card/60 backdrop-blur p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-mono">
            <span className="text-foreground font-semibold">{selected.size}</span>
            <span className="text-muted-foreground"> selected</span>
          </p>
          <div className="h-4 w-px bg-border/60" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={selected.size === 0}
            className="h-9 border border-input bg-background rounded-md px-3 text-sm flex-1 min-w-[180px] disabled:opacity-50"
          >
            <option value="">— pick a category —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <input
              type="checkbox"
              checked={saveRule}
              onChange={(e) => setSaveRule(e.target.checked)}
              className="accent-emerald-500"
            />
            save_rule
          </label>
          {saveRule && (
            <Input
              value={ruleKeyword}
              onChange={(e) => setRuleKeyword(e.target.value)}
              placeholder="keyword (e.g. 'stripe')"
              className="h-9 max-w-[180px] font-mono text-xs"
            />
          )}
          <Button onClick={apply} disabled={applying || selected.size === 0 || !category} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold ml-auto">
            {applying ? "..." : `Apply to ${selected.size}`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by description..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 font-mono text-xs">
          {(["uncategorized", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-md border transition-colors ${
                filter === f ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={selectAllVisible}
          className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border bg-card/60 rounded-md px-2.5 py-1.5"
        >
          {selected.size === filtered.length && filtered.length > 0 ? "unselect_all" : "select_all_visible"}
        </button>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} txns</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <p className="font-medium text-foreground">Nothing to categorize</p>
          <p className="text-sm text-muted-foreground mt-1">All transactions in this filter are already classified.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border/60 text-left">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">date</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">description</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">current</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => toggleSelected(tx.id)}
                  className={`cursor-pointer hover:bg-card/30 ${selected.has(tx.id) ? "bg-emerald-500/[0.08]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(tx.id)}
                      onChange={() => toggleSelected(tx.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-2 text-sm max-w-md truncate">{tx.description}</td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border bg-card/60 px-1.5 py-0.5 rounded">
                      {tx.category ?? "uncategorized"}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-sm ${tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
