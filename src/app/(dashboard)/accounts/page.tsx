"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, Link2, Loader2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface BankAccount {
  id: string;
  name: string;
  accountType: string;
  institutionName: string | null;
  lastFourDigits: string | null;
  currentBalance: number;
  currency: string;
  isPlaidLinked: boolean;
  _count: { transactions: number };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    accountType: "CHECKING",
    institutionName: "",
    lastFourDigits: "",
    currentBalance: "0",
    currency: "USD",
  });

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [transferForm, setTransferForm] = useState({ fromAccountId: "", toAccountId: "", amount: "", date: today, description: "", reference: "" });

  async function load() {
    const res = await fetch("/api/bank-accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function fmt(amount: number) {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function handleTransfer() {
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    setTransferring(true);
    const res = await fetch("/api/bank-accounts/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount: parseFloat(transferForm.amount),
        date: transferForm.date,
        description: transferForm.description || undefined,
        reference: transferForm.reference || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Transfer completed");
      setShowTransfer(false);
      setTransferForm({ fromAccountId: "", toAccountId: "", amount: "", date: today, description: "", reference: "" });
      load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Transfer failed");
    }
    setTransferring(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, currentBalance: parseFloat(form.currentBalance) }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Account added");
      setOpen(false);
      setForm({ name: "", accountType: "CHECKING", institutionName: "", lastFourDigits: "", currentBalance: "0", currency: "USD" });
      await load();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setSaving(false);
    }
  }

  const typeColors: Record<string, string> = {
    CHECKING: "border-blue-500/30 text-blue-400",
    SAVINGS: "border-emerald-500/30 text-emerald-400",
    CREDIT_CARD: "border-orange-500/30 text-orange-400",
    LOAN: "border-red-500/30 text-red-400",
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your connected accounts</p>
        </div>
        <div className="flex gap-3">
          <Link href="/bank-sync">
            <Button variant="outline" className="gap-2">
              <Link2 className="h-4 w-4" /> Connect via Plaid
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight className="h-4 w-4" /> Transfer Funds
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : accounts.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Landmark className="h-10 w-10 mb-4 opacity-20" />
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm mt-1">Add your first bank account to get started</p>
            <Button onClick={() => setOpen(true)} className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acct) => (
            <Card key={acct.id} className="border-border bg-card hover:border-emerald-500/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{acct.name}</CardTitle>
                    {acct.institutionName && <p className="text-xs text-muted-foreground mt-0.5">{acct.institutionName}</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs ${typeColors[acct.accountType] ?? ""}`}>
                    {acct.accountType.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    ${acct.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  {acct.lastFourDigits && <p className="text-xs text-muted-foreground">•••• {acct.lastFourDigits}</p>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{acct._count.transactions} transactions</span>
                  {acct.isPlaidLinked && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Plaid</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fund Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Fund Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>From Account</Label>
              <Select value={transferForm.fromAccountId} onValueChange={v => setTransferForm(f => ({ ...f, fromAccountId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.currentBalance)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select value={transferForm.toAccountId} onValueChange={v => setTransferForm(f => ({ ...f, toAccountId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== transferForm.fromAccountId).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={transferForm.date} onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={transferForm.description} onChange={e => setTransferForm(f => ({ ...f, description: e.target.value }))} placeholder="Transfer description" />
            </div>
            <div className="space-y-1.5">
              <Label>Reference (optional)</Label>
              <Input value={transferForm.reference} onChange={e => setTransferForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. TRF-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={transferring} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {transferring && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transfer Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input placeholder="Chase Business Checking" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.accountType} onValueChange={v => setForm(p => ({ ...p, accountType: v as string }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Checking</SelectItem>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="LOAN">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last 4 Digits</Label>
                <Input placeholder="4242" maxLength={4} value={form.lastFourDigits} onChange={e => setForm(p => ({ ...p, lastFourDigits: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input placeholder="Chase" value={form.institutionName} onChange={e => setForm(p => ({ ...p, institutionName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Opening Balance ($)</Label>
                <Input type="number" step="0.01" value={form.currentBalance} onChange={e => setForm(p => ({ ...p, currentBalance: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
