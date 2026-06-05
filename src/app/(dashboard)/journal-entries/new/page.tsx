"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface Line {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

function newLine(): Line {
  return { id: crypto.randomUUID(), accountId: "", description: "", debit: "", credit: "" };
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [type, setType] = useState("MANUAL");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine(), newLine()]);
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/chart-of-accounts");
    if (res.ok) {
      const data: Account[] = await res.json();
      setAccounts(data.filter((a) => a.isActive));
    }
    setLoadingAccounts(false);
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  function updateLine(id: string, field: keyof Line, value: string) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        // When entering debit, clear credit; when entering credit, clear debit
        if (field === "debit" && value !== "") updated.credit = "";
        if (field === "credit" && value !== "") updated.debit = "";
        return updated;
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.001 && totalDebits > 0;
  const canSubmit = isBalanced && !!date && !!description && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const payload = {
      date,
      description,
      reference: reference || undefined,
      type,
      memo: memo || undefined,
      lines: lines
        .filter((l) => l.accountId)
        .map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
    };

    const res = await fetch("/api/journal-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Journal entry ${data.entryNumber} created`);
      router.push("/journal-entries");
    } else {
      toast.error(data.error ?? "Failed to create journal entry");
    }
    setSubmitting(false);
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/journal-entries")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Journal Entry</h1>
          <p className="text-muted-foreground mt-1 text-sm">Debits must equal credits before you can save</p>
        </div>
      </div>

      {/* Entry header fields */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setType(v ?? "MANUAL")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="AUTO">Auto</SelectItem>
                  <SelectItem value="DEPRECIATION">Depreciation</SelectItem>
                  <SelectItem value="ACCRUAL">Accrual</SelectItem>
                  <SelectItem value="PREPAYMENT">Prepayment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="INV-001, PO-002..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="e.g. Monthly rent payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>Memo (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Internal notes"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_2rem] gap-2 px-1 pb-2 text-xs text-muted-foreground font-medium">
            <span>Account</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span></span>
          </div>

          {loadingAccounts ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_2rem] gap-2 items-center">
                  <Select
                    value={line.accountId}
                    onValueChange={(v) => updateLine(line.id, "accountId", v ?? "")}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, "description", e.target.value)}
                  />
                  <Input
                    className="h-9 text-sm text-right font-mono"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                  />
                  <Input
                    className="h-9 text-sm text-right font-mono"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-8 p-0"
                    disabled={lines.length <= 2}
                    onClick={() => removeLine(line.id)}
                    tabIndex={-1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_2rem] gap-2 items-center font-medium text-sm">
            <div></div>
            <div className="text-right text-muted-foreground text-xs">Totals</div>
            <div className={`text-right font-mono ${totalDebits > 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-right font-mono ${totalCredits > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div></div>
          </div>

          {/* Balance indicator */}
          <div className="mt-3">
            {totalDebits === 0 && totalCredits === 0 ? null : isBalanced ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Balanced
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                Out of balance by {difference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.push("/journal-entries")}>
          Cancel
        </Button>
        <Button
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Post Journal Entry
        </Button>
      </div>
    </div>
  );
}
