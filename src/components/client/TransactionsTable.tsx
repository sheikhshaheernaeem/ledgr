"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Txn {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  confidence: number | null;
  aiNotes: string | null;
}

export function TransactionsTable({ transactions, currency }: { transactions: Txn[]; currency: string }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category ?? "Uncategorized"))).sort(),
    [transactions],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && (t.category ?? "Uncategorized") !== filterCategory) return false;
      if (term && !t.description.toLowerCase().includes(term) && !(t.category ?? "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [transactions, search, filterType, filterCategory]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  async function exportCsv() {
    setExporting(true);
    try {
      const ids = filtered.map((t) => t.id);
      const res = await fetch("/api/ai/generate-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: ids, scope: "selected" }),
      });
      if (!res.ok) throw new Error("CSV failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledgr-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} transactions`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setExporting(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or category…"
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "INCOME" | "EXPENSE")}
          className="h-10 border border-input bg-background rounded-md px-3 text-sm"
        >
          <option value="all">All types</option>
          <option value="INCOME">Income only</option>
          <option value="EXPENSE">Expenses only</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 border border-input bg-background rounded-md px-3 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={exportCsv} disabled={exporting || filtered.length === 0} variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
          {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
          CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            results · {filtered.length}
          </p>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs">
            <thead className="bg-card/60 sticky top-0 z-10">
              <tr className="text-left text-muted-foreground font-mono">
                <th className="px-3 py-2 font-normal">Date</th>
                <th className="px-3 py-2 font-normal">Description</th>
                <th className="px-3 py-2 font-normal">Category</th>
                <th className="px-3 py-2 font-normal text-right">Amount</th>
                <th className="px-3 py-2 font-normal text-right">AI conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((t) => {
                const positive = t.type === "INCOME" || t.amount > 0;
                return (
                  <tr key={t.id} className="hover:bg-card/60">
                    <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                      {t.date.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-foreground">{t.description}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                        {t.category ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${positive ? "text-emerald-500" : "text-rose-500"}`}>
                      {positive ? "+" : "-"}{fmt(Math.abs(t.amount)).replace(/^-/, "")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                      {t.confidence !== null ? `${Math.round(t.confidence * 100)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
