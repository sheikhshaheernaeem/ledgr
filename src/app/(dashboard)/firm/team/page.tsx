"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Users, Plus, Loader2, UserCheck, Clock, ExternalLink } from "lucide-react";

interface Operator {
  id: string;
  name: string | null;
  email: string;
  role: string;
  clientCount: number;
  hoursLast30Days: number;
}

interface ClientLite {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  managedBy: string[];
}

export default function TeamPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [assignOpId, setAssignOpId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opRes, clRes] = await Promise.all([
        fetch("/api/firm/team"),
        fetch("/api/admin/users-clients"),
      ]);
      if (opRes.ok) setOperators(await opRes.json());
      if (clRes.ok) {
        const data = await clRes.json();
        setClients(data.clients ?? []);
      }
    } catch {
      toast.error("Failed to load team");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function assign() {
    if (!assignClientId || !assignOpId) return;
    try {
      const res = await fetch("/api/firm/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountantId: assignOpId, clientId: assignClientId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Assigned");
      setAssignOpen(false);
      setAssignClientId("");
      setAssignOpId("");
      load();
    } catch {
      toast.error("Failed to assign");
    }
  }

  async function unassign(accountantId: string, clientId: string) {
    if (!confirm("Remove this assignment?")) return;
    await fetch(`/api/firm/team?accountantId=${accountantId}&clientId=${clientId}`, { method: "DELETE" });
    load();
  }

  const totalClients = clients.length;
  const assignedClients = clients.filter((c) => c.managedBy.length > 0).length;
  const unassignedClients = clients.filter((c) => c.managedBy.length === 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Users className="h-3 w-3" /> firm / team
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Team &amp; assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Who owns which clients. Workload &amp; utilization. Admin-only.
          </p>
        </div>
        <Button onClick={() => setAssignOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Assign client
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="operators" value={operators.length.toString()} />
        <Stat label="clients_total" value={totalClients.toString()} />
        <Stat label="assigned" value={assignedClients.toString()} color="text-emerald-400" />
        <Stat label="unassigned" value={unassignedClients.length.toString()} color={unassignedClients.length > 0 ? "text-amber-400" : "text-foreground"} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {operators.map((op) => {
            const opClients = clients.filter((c) => c.managedBy.includes(op.id));
            const avgHrsPerClient = op.clientCount > 0 ? op.hoursLast30Days / op.clientCount : 0;
            return (
              <section key={op.id} className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 bg-card/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-400 uppercase">
                        {(op.name ?? op.email)[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{op.name ?? op.email}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {op.role.toLowerCase()} · {op.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <span><span className="text-muted-foreground">clients</span> <span className="text-foreground font-semibold">{op.clientCount}</span></span>
                    <span><span className="text-muted-foreground">hrs_30d</span> <span className="text-foreground font-semibold">{op.hoursLast30Days}h</span></span>
                    <span><span className="text-muted-foreground">avg_per_client</span> <span className="text-foreground font-semibold">{avgHrsPerClient.toFixed(1)}h</span></span>
                  </div>
                </div>
                {opClients.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No clients assigned.</p>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {opClients.map((c) => (
                      <li key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-card/30">
                        <Link href={`/firm/${c.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="text-sm text-foreground truncate">{c.companyName ?? c.name ?? c.email}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                        <button
                          onClick={() => unassign(op.id, c.id)}
                          className="text-xs font-mono text-muted-foreground hover:text-rose-400 shrink-0"
                        >
                          unassign
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {unassignedClients.length > 0 && (
            <section className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-500/30 bg-amber-500/[0.06]">
                <p className="font-mono text-[11px] uppercase tracking-wider text-amber-400">
                  unassigned_clients · {unassignedClients.length}
                </p>
              </div>
              <ul className="divide-y divide-border/40">
                {unassignedClients.map((c) => (
                  <li key={c.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-card/30">
                    <Link href={`/firm/${c.id}`} className="text-sm text-foreground truncate flex-1">
                      {c.companyName ?? c.name ?? c.email}
                    </Link>
                    <button
                      onClick={() => { setAssignClientId(c.id); setAssignOpen(true); }}
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 shrink-0"
                    >
                      assign →
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign client to operator</DialogTitle>
            <DialogDescription>The operator can then view + edit this client&apos;s books.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Client</label>
              <select
                value={assignClientId}
                onChange={(e) => setAssignClientId(e.target.value)}
                className="w-full h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                <option value="">— select —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName ?? c.name ?? c.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Operator</label>
              <select
                value={assignOpId}
                onChange={(e) => setAssignOpId(e.target.value)}
                className="w-full h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                <option value="">— select —</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.name ?? o.email} ({o.role.toLowerCase()}) — {o.clientCount} clients</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={assign} disabled={!assignClientId || !assignOpId} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
