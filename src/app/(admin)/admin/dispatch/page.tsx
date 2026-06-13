"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Inbox, Clock, CheckCircle2, AlertTriangle, Loader2, Filter } from "lucide-react";

interface Request {
  id: string;
  clientId: string;
  category: string;
  title: string;
  description: string | null;
  urgency: string;
  status: string;
  assignedToId: string | null;
  allocatedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  deliverableUrl: string | null;
  deliverableNote: string | null;
}
interface Client { id: string; name: string | null; email: string; companyName: string | null }
interface Accountant {
  id: string; name: string | null; email: string; role: string;
  _count: { managedClients: number };
}

const statusStyle: Record<string, string> = {
  OPEN: "border-amber-500/40 bg-amber-500/[0.08] text-amber-400",
  ALLOCATED: "border-blue-500/40 bg-blue-500/[0.08] text-blue-400",
  IN_PROGRESS: "border-violet-500/40 bg-violet-500/[0.08] text-violet-400",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400",
  CANCELLED: "border-border bg-card/60 text-muted-foreground",
};

const urgencyStyle: Record<string, string> = {
  HIGH: "text-rose-400",
  MED: "text-amber-400",
  LOW: "text-muted-foreground",
};

export default function DispatchPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"NEEDS_ALLOCATION" | "IN_PROGRESS" | "COMPLETED" | "ALL">("NEEDS_ALLOCATION");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dispatch");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests ?? []);
      setClients(data.clients ?? []);
      setAccountants(data.accountants ?? []);
    } catch {
      toast.error("Failed to load");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function allocate(requestId: string, assignedToId: string) {
    try {
      const res = await fetch("/api/admin/dispatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, assignedToId: assignedToId || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(assignedToId ? "Allocated" : "Unallocated");
      load();
    } catch {
      toast.error("Failed to allocate");
    }
  }

  const clientMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, c.companyName ?? c.name ?? c.email);
    return m;
  }, [clients]);
  const accountantMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accountants) m.set(a.id, a.name ?? a.email);
    return m;
  }, [accountants]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter === "NEEDS_ALLOCATION") return r.status === "OPEN";
      if (filter === "IN_PROGRESS") return r.status === "ALLOCATED" || r.status === "IN_PROGRESS";
      if (filter === "COMPLETED") return r.status === "COMPLETED";
      return true;
    });
  }, [requests, filter]);

  const counts = {
    open: requests.filter((r) => r.status === "OPEN").length,
    allocated: requests.filter((r) => r.status === "ALLOCATED" || r.status === "IN_PROGRESS").length,
    completed: requests.filter((r) => r.status === "COMPLETED").length,
    total: requests.length,
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Inbox className="h-3 w-3" /> admin / dispatch
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Request dispatch</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Route incoming client requests to the right accountant. Your job here is just allocation.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="needs_allocation" value={counts.open.toString()} color={counts.open > 0 ? "text-amber-400" : "text-foreground"} icon={AlertTriangle} />
        <Stat label="in_progress" value={counts.allocated.toString()} color="text-blue-400" icon={Clock} />
        <Stat label="completed" value={counts.completed.toString()} color="text-emerald-400" icon={CheckCircle2} />
        <Stat label="total" value={counts.total.toString()} icon={Inbox} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
        <Filter className="h-3 w-3 text-muted-foreground mr-1" />
        {([
          ["NEEDS_ALLOCATION", `needs_allocation (${counts.open})`],
          ["IN_PROGRESS", `in_progress (${counts.allocated})`],
          ["COMPLETED", `completed (${counts.completed})`],
          ["ALL", "all"],
        ] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              filter === f ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto mb-3" />
          <p className="font-medium text-foreground">Nothing to dispatch</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "NEEDS_ALLOCATION" ? "All requests are allocated." : "No requests match this filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border/60 text-left">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">client</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">what they need</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">priority</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">status</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground min-w-[200px]">allocate to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-card/30 align-top">
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium text-foreground">{clientMap.get(r.clientId) ?? "Unknown"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      submitted {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </td>
                  <td className="px-3 py-3 max-w-md">
                    <p className="text-sm text-foreground">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>}
                    <p className="font-mono text-[10px] text-muted-foreground mt-1.5">{r.category.toLowerCase().replace(/_/g, " ")}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[r.urgency] ?? ""}`}>
                      ● {r.urgency.toLowerCase()}
                    </span>
                    {r.dueAt && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">
                        due {new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle[r.status] ?? statusStyle.OPEN}`}>
                      {r.status.toLowerCase().replace(/_/g, " ")}
                    </span>
                    {r.assignedToId && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">
                        ↳ {accountantMap.get(r.assignedToId) ?? "—"}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={r.assignedToId ?? ""}
                      onChange={(e) => allocate(r.id, e.target.value)}
                      disabled={r.status === "COMPLETED"}
                      className="w-full h-8 border border-input bg-background rounded-md px-2 text-xs font-mono disabled:opacity-50"
                    >
                      <option value="">— unassigned —</option>
                      {accountants.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name ?? a.email} ({a.role.toLowerCase()}) · {a._count.managedClients} clients
                        </option>
                      ))}
                    </select>
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

function Stat({ label, value, color = "text-foreground", icon: Icon }: {
  label: string; value: string; color?: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
