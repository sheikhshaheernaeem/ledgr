"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Account { code: string; name: string; type: string; }
interface BalMap { [code: string]: { debit: number; credit: number; asOfDate: string } }

const typeColor: Record<string, string> = {
  ASSET: "border-cyan-500/30 text-cyan-400",
  LIABILITY: "border-red-500/30 text-red-400",
  EQUITY: "border-purple-500/30 text-purple-400",
  REVENUE: "border-emerald-500/30 text-emerald-400",
  EXPENSE: "border-orange-500/30 text-orange-400",
};

export default function OpeningBalancesForm({ accounts, initialBalances, initialAsOfDate }: { accounts: Account[]; initialBalances: BalMap; initialAsOfDate: string }) {
  const [balances, setBalances] = useState<Record<string, { debit: string; credit: string }>>(
    Object.fromEntries(accounts.map((a) => [a.code, { debit: String(initialBalances[a.code]?.debit ?? ""), credit: String(initialBalances[a.code]?.credit ?? "") }]))
  );
  const [asOfDate, setAsOfDate] = useState(initialAsOfDate);
  const [saving, setSaving] = useState(false);

  const totalDebits = accounts.reduce((s, a) => s + (parseFloat(balances[a.code]?.debit) || 0), 0);
  const totalCredits = accounts.reduce((s, a) => s + (parseFloat(balances[a.code]?.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  async function save() {
    setSaving(true);
    try {
      const data = accounts
        .filter((a) => (parseFloat(balances[a.code]?.debit) || 0) > 0 || (parseFloat(balances[a.code]?.credit) || 0) > 0)
        .map((a) => ({
          accountCode: a.code,
          accountName: a.name,
          accountType: a.type,
          debit: parseFloat(balances[a.code]?.debit) || 0,
          credit: parseFloat(balances[a.code]?.credit) || 0,
        }));
      const res = await fetch("/api/opening-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asOfDate, balances: data }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Opening balances saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const groupedByType = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.type] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="space-y-2 w-48">
          <Label>As of Date</Label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </div>
        <div className={`flex gap-6 text-sm px-4 py-2 rounded-lg border ${isBalanced ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          <span>Debits: <strong>${totalDebits.toFixed(2)}</strong></span>
          <span>Credits: <strong>${totalCredits.toFixed(2)}</strong></span>
          <span className={isBalanced ? "text-emerald-400" : "text-red-400"}>
            {isBalanced ? "✓ Balanced" : `Difference: $${Math.abs(totalDebits - totalCredits).toFixed(2)}`}
          </span>
        </div>
      </div>

      {Object.entries(groupedByType).map(([type, accts]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={typeColor[type] ?? ""}>{type}</Badge>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2 pb-1">
              <div className="col-span-2">Code</div>
              <div className="col-span-5">Account Name</div>
              <div className="col-span-2 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
            </div>
            {accts.map((a) => (
              <div key={a.code} className="grid grid-cols-12 gap-2 items-center px-2 py-1 rounded hover:bg-muted/30">
                <div className="col-span-2 font-mono text-xs text-muted-foreground">{a.code}</div>
                <div className="col-span-5 text-sm">{a.name}</div>
                <div className="col-span-2">
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="h-7 text-right text-sm"
                    value={balances[a.code]?.debit ?? ""}
                    onChange={(e) => setBalances((p) => ({ ...p, [a.code]: { ...p[a.code], debit: e.target.value } }))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="h-7 text-right text-sm"
                    value={balances[a.code]?.credit ?? ""}
                    onChange={(e) => setBalances((p) => ({ ...p, [a.code]: { ...p[a.code], credit: e.target.value } }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">Set up your Chart of Accounts first before entering opening balances.</p>
      )}

      <Button onClick={save} disabled={saving || accounts.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Opening Balances
      </Button>
    </div>
  );
}
