"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Users, Building2, Mail, ChevronRight, Trash2, AlertCircle,
} from "lucide-react";

interface ManagedClient {
  id: string;
  clientId: string;
  createdAt: string;
  client: {
    id: string;
    name: string | null;
    email: string;
    companyName: string | null;
  };
}

interface ClientSummary {
  invoices: {
    open: number;
    overdue: number;
    openAmount: number;
  };
  lastReport: {
    month: number;
    year: number;
    netProfit: number;
  } | null;
}

export default function FirmPage() {
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ClientSummary>>({});
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const [removeId, setRemoveId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/managed-clients");
      if (!res.ok) throw new Error();
      const data: ManagedClient[] = await res.json();
      setClients(data);
      // Fetch summaries for each client
      data.forEach((c) => fetchSummary(c.clientId));
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(clientId: string) {
    try {
      const res = await fetch(`/api/managed-clients/${clientId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [clientId]: data.summary }));
    } catch {}
  }

  async function handleAddClient() {
    if (!clientEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/managed-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: clientEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add client");
        return;
      }
      toast.success("Client added to your firm");
      setAddOpen(false);
      setClientEmail("");
      fetchClients();
    } catch {
      toast.error("Failed to add client");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(clientId: string) {
    try {
      const res = await fetch(`/api/managed-clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Client removed");
      setRemoveId(null);
      fetchClients();
    } catch {
      toast.error("Failed to remove client");
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthName = (month: number, year: number) =>
    new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-muted-foreground mt-1">Firm management — view and manage client books</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
        >
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Explanation Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Add clients by their Ledgr email to view their books and manage their account. Clients must have an existing Ledgr account.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : clients.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm mt-1">Add a client by their Ledgr email address.</p>
            <Button
              onClick={() => setAddOpen(true)}
              className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            >
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((mc) => {
            const summary = summaries[mc.clientId];
            const displayName = mc.client.name ?? mc.client.email;
            return (
              <Card key={mc.id} className="border-border bg-card hover:border-emerald-500/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{displayName}</CardTitle>
                      {mc.client.companyName && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <CardDescription className="truncate">{mc.client.companyName}</CardDescription>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 shrink-0">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {mc.client.email}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Summary stats */}
                  {summary ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-border p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{summary.invoices.open}</p>
                        <p className="text-xs text-muted-foreground">Open Invoices</p>
                        {summary.invoices.overdue > 0 && (
                          <p className="text-xs text-red-400">{summary.invoices.overdue} overdue</p>
                        )}
                      </div>
                      <div className="rounded-md border border-border p-2 text-center">
                        <p className="text-sm font-bold text-foreground">
                          ${fmt(summary.invoices.openAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Loading summary…</p>
                    </div>
                  )}

                  {summary?.lastReport && (
                    <p className="text-xs text-muted-foreground">
                      Last report: {monthName(summary.lastReport.month, summary.lastReport.year)} ·{" "}
                      <span className={summary.lastReport.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {summary.lastReport.netProfit >= 0 ? "+" : ""}${fmt(summary.lastReport.netProfit)} net
                      </span>
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/firm/${mc.clientId}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        View Books <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-red-400 px-2"
                      onClick={() => setRemoveId(mc.clientId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Client&apos;s Ledgr Email *</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddClient(); }}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                The client must already have a Ledgr account.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddClient}
              disabled={adding}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              {adding ? "Adding…" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm */}
      <Dialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remove Client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove your access to this client&apos;s books. The client&apos;s account and data will not be affected.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => removeId && handleRemove(removeId)}
            >
              Remove Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
