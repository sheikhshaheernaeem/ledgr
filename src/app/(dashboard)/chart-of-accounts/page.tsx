"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Loader2, BookOpen, Sprout, ToggleLeft, ToggleRight } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
  description: string | null;
  parentCode: string | null;
  normalBalance: string;
  isSystem: boolean;
  isActive: boolean;
}

const TYPE_FILTERS = ["All", "Assets", "Liabilities", "Equity", "Revenue", "Expenses"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const TYPE_MAP: Record<string, TypeFilter> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expenses",
};

const TYPE_BADGE: Record<string, string> = {
  ASSET: "border-blue-500/30 text-blue-400",
  LIABILITY: "border-orange-500/30 text-orange-400",
  EQUITY: "border-purple-500/30 text-purple-400",
  REVENUE: "border-emerald-500/30 text-emerald-400",
  EXPENSE: "border-red-500/30 text-red-400",
};

const emptyNew = {
  code: "", name: "", type: "ASSET", subtype: "", normalBalance: "DEBIT", description: "",
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>("All");
  const [seeding, setSeeding] = useState(false);

  // New account dialog
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyNew });
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", subtype: "", parentCode: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/chart-of-accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seedCoA() {
    setSeeding(true);
    const res = await fetch("/api/chart-of-accounts/seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Seeded ${data.seeded} default accounts`);
      load();
    } else {
      toast.error(data.error ?? "Seed failed");
    }
    setSeeding(false);
  }

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/chart-of-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Account ${data.code} created`);
      setShowNew(false);
      setNewForm({ ...emptyNew });
      load();
    } else {
      toast.error(data.error ?? "Create failed");
    }
    setSaving(false);
  }

  function openEdit(a: Account) {
    setEditAccount(a);
    setEditForm({
      name: a.name,
      description: a.description ?? "",
      subtype: a.subtype ?? "",
      parentCode: a.parentCode ?? "",
    });
  }

  async function handleEdit() {
    if (!editAccount) return;
    setEditSaving(true);
    const res = await fetch(`/api/chart-of-accounts/${editAccount.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Account updated");
      setEditAccount(null);
      load();
    } else {
      toast.error(data.error ?? "Update failed");
    }
    setEditSaving(false);
  }

  async function toggleActive(a: Account) {
    const res = await fetch(`/api/chart-of-accounts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    if (res.ok) {
      toast.success(a.isActive ? "Account deactivated" : "Account activated");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Update failed");
    }
  }

  const filtered = accounts.filter((a) => {
    if (filter === "All") return true;
    return TYPE_MAP[a.type] === filter;
  });

  // Summary counts
  const typeCounts: Record<string, number> = {};
  for (const a of accounts) {
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            {accounts.length} accounts — {Object.entries(typeCounts).map(([t, c]) => `${c} ${TYPE_MAP[t] ?? t}`).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-xs"
            onClick={seedCoA}
            disabled={seeding}
          >
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sprout className="h-3.5 w-3.5" />}
            Seed Default CoA
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            onClick={() => setShowNew(true)}
          >
            <Plus className="h-4 w-4" /> New Account
          </Button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
            {f !== "All" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({accounts.filter((a) => TYPE_MAP[a.type] === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            Accounts{" "}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No accounts. Click &ldquo;Seed Default CoA&rdquo; to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id} className={!a.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm text-muted-foreground">{a.code}</TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{a.name}</span>
                        {a.subtype && (
                          <span className="ml-2 text-xs text-muted-foreground">{a.subtype}</span>
                        )}
                        {a.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{a.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${TYPE_BADGE[a.type] ?? ""}`}>
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${a.normalBalance === "DEBIT" ? "border-zinc-500/30 text-zinc-400" : "border-zinc-500/30 text-zinc-300"}`}
                      >
                        {a.normalBalance}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.isActive ? (
                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-zinc-500/30 text-zinc-500">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={a.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(a)}
                        >
                          {a.isActive
                            ? <ToggleRight className="h-4 w-4 text-emerald-400" />
                            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Account Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. 1050"
                  value={newForm.code}
                  onChange={(e) => setNewForm({ ...newForm, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={newForm.type}
                  onValueChange={(v) => setNewForm({
                    ...newForm,
                    type: v ?? "ASSET",
                    normalBalance: ["ASSET", "EXPENSE"].includes(v ?? "") ? "DEBIT" : "CREDIT",
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Account name"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Subtype (optional)</Label>
                <Input
                  placeholder="e.g. Current"
                  value={newForm.subtype}
                  onChange={(e) => setNewForm({ ...newForm, subtype: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Normal Balance</Label>
                <Select
                  value={newForm.normalBalance}
                  onValueChange={(v) => setNewForm({ ...newForm, normalBalance: v ?? "DEBIT" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Optional description"
                rows={2}
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleCreate}
              disabled={saving || !newForm.code || !newForm.name}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Account — {editAccount?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Subtype (optional)</Label>
                <Input
                  placeholder="e.g. Current"
                  value={editForm.subtype}
                  onChange={(e) => setEditForm({ ...editForm, subtype: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Parent Code (optional)</Label>
                <Input
                  placeholder="e.g. 1000"
                  value={editForm.parentCode}
                  onChange={(e) => setEditForm({ ...editForm, parentCode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccount(null)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleEdit}
              disabled={editSaving || !editForm.name}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
