"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitMerge, CheckCircle2, Circle } from "lucide-react";

interface BankAccount { id: string; name: string; accountType: string; }
interface Transaction { id: string; date: string; description: string; amount: number; type: "DEBIT" | "CREDIT"; category: string | null; reconciled: boolean; }

export default function NewReconciliationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("accountId");

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(preselectedAccountId ?? "");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0]);
  const [statementBalance, setStatementBalance] = useState("");
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    fetch("/api/bank-accounts").then(r => r.ok ? r.json() : []).then(setAccounts);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoadingTx(true);
    fetch(`/api/transactions?bankAccountId=${selectedAccountId}&unreconciled=true`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTransactions(data); setLoadingTx(false); });
  }, [selectedAccountId]);

  function toggleTx(id: string) {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedTxIds.size === transactions.length) setSelectedTxIds(new Set());
    else setSelectedTxIds(new Set(transactions.map(t => t.id)));
  }

  const selectedSum = transactions
    .filter(t => selectedTxIds.has(t.id))
    .reduce((s, t) => t.type === "CREDIT" ? s + t.amount : s - t.amount, 0);

  const balance = parseFloat(statementBalance) || 0;
  const difference = balance - selectedSum;

  async function handleSave() {
    if (!selectedAccountId || !statementDate || !statementBalance) {
      toast.error("Fill in all required fields");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankAccountId: selectedAccountId,
        statementDate,
        statementBalance: parseFloat(statementBalance),
        transactionIds: Array.from(selectedTxIds),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Reconciliation saved");
      router.push(`/reconciliation/${data.id}`);
    } else {
      toast.error("Failed to save reconciliation");
    }
    setSaving(false);
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Reconciliation</h1>
        <p className="text-muted-foreground mt-1">Match your transactions to a bank statement</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Statement Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Bank Account</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
            >
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Statement Date</label>
            <Input type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Statement Ending Balance</label>
            <Input type="number" step="0.01" placeholder="0.00" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {selectedAccountId && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Transactions to Match</CardTitle>
            <Button size="sm" variant="outline" onClick={toggleAll} className="text-xs">
              {selectedTxIds.size === transactions.length ? "Deselect All" : "Select All"}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTx ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No unreconciled transactions for this account</p>
            ) : (
              <div className="space-y-1">
                {transactions.map(tx => {
                  const checked = selectedTxIds.has(tx.id);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => toggleTx(tx.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${checked ? "border-emerald-500/40 bg-emerald-500/5" : "border-transparent hover:border-border"}`}
                    >
                      {checked ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()} · {tx.category ?? "Uncategorized"}</p>
                      </div>
                      <span className={`text-sm font-medium shrink-0 ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTxIds.size > 0 && (
        <Card className={`border-2 ${Math.abs(difference) < 0.01 ? "border-emerald-500/40 bg-emerald-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Statement Balance</p>
                <p className="text-lg font-bold text-foreground mt-1">${balance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Selected Transactions</p>
                <p className="text-lg font-bold text-foreground mt-1">${selectedSum.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Difference</p>
                <p className={`text-lg font-bold mt-1 ${Math.abs(difference) < 0.01 ? "text-emerald-400" : "text-yellow-400"}`}>
                  {Math.abs(difference) < 0.01 ? "Balanced ✓" : `$${difference.toFixed(2)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={saving || !selectedAccountId || !statementBalance}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
          Save Reconciliation
        </Button>
      </div>
    </div>
  );
}
