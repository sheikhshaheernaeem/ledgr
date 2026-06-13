"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckSquare, Plus, Clock, AlertTriangle, Calendar, Trash2,
  CheckCircle2, Circle, PlayCircle, Loader2, X,
} from "lucide-react";

interface FirmTask {
  id: string;
  ownerId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  category: string | null;
  createdAt: string;
}

interface ClientLite {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
}

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: "border-rose-500/40 bg-rose-500/[0.08] text-rose-400",
  MED: "border-amber-500/40 bg-amber-500/[0.08] text-amber-400",
  LOW: "border-border bg-card/60 text-muted-foreground",
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  OPEN: Circle,
  IN_PROGRESS: PlayCircle,
  DONE: CheckCircle2,
};

const CATEGORIES = ["MONTHLY_CLOSE", "TAX_PREP", "RECONCILE", "FOLLOW_UP", "REVIEW", "ADMIN"];

export default function FirmTasksPage() {
  const [tasks, setTasks] = useState<FirmTask[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"OPEN" | "DONE" | "ALL">("OPEN");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    clientId: "",
    dueAt: "",
    priority: "MED",
    category: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/firm/tasks"),
        fetch("/api/managed-clients"),
      ]);
      if (!tRes.ok) throw new Error();
      setTasks(await tRes.json());
      if (cRes.ok) {
        const cData = await cRes.json();
        const list = Array.isArray(cData) ? cData : cData.clients ?? [];
        // Normalize: managed-clients returns ManagedClient records with nested .client
        const normalized: ClientLite[] = list.map((row: { client?: ClientLite } & ClientLite) =>
          row.client ?? row
        );
        setClients(normalized);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/firm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || undefined,
          dueAt: form.dueAt || undefined,
          category: form.category || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task created");
      setForm({ title: "", description: "", clientId: "", dueAt: "", priority: "MED", category: "" });
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(t: FirmTask) {
    const next = t.status === "DONE" ? "OPEN" : t.status === "OPEN" ? "IN_PROGRESS" : "DONE";
    try {
      const res = await fetch(`/api/firm/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/firm/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const clientMap = new Map(clients.map((c) => [c.id, c.companyName ?? c.name ?? c.email]));

  const filtered = tasks.filter((t) =>
    filter === "ALL" ? true : filter === "OPEN" ? t.status !== "DONE" : t.status === "DONE"
  );

  const counts = {
    open: tasks.filter((t) => t.status !== "DONE").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    overdue: tasks.filter((t) => t.status !== "DONE" && t.dueAt && new Date(t.dueAt) < new Date()).length,
    high: tasks.filter((t) => t.status !== "DONE" && t.priority === "HIGH").length,
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckSquare className="h-3 w-3" /> firm / tasks
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Your tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your to-dos across every client. Reviews, follow-ups, deadlines.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New task
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="open" value={counts.open.toString()} color="text-foreground" />
        <Stat label="overdue" value={counts.overdue.toString()} color={counts.overdue > 0 ? "text-rose-400" : "text-foreground"} />
        <Stat label="high_priority" value={counts.high.toString()} color={counts.high > 0 ? "text-amber-400" : "text-foreground"} />
        <Stat label="completed" value={counts.done.toString()} color="text-emerald-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-1 text-xs font-mono">
        {(["OPEN", "DONE", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              filter === f ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto mb-3" />
          <p className="font-medium text-foreground">
            {filter === "DONE" ? "No completed tasks yet" : "Nothing in your queue"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "DONE" ? "Finished tasks land here." : "Click 'New task' to add your first."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const Icon = STATUS_ICON[t.status] ?? Circle;
            const isOverdue = t.status !== "DONE" && t.dueAt && new Date(t.dueAt) < new Date();
            return (
              <li
                key={t.id}
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  t.status === "DONE" ? "border-border/40 bg-card/30 opacity-60" : "border-border/60 bg-card/40"
                } hover:bg-card/60 transition-colors`}
              >
                <button onClick={() => toggleStatus(t)} className="mt-0.5 shrink-0">
                  <Icon className={`h-5 w-5 ${
                    t.status === "DONE" ? "text-emerald-400" :
                    t.status === "IN_PROGRESS" ? "text-amber-400" : "text-muted-foreground hover:text-foreground"
                  }`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium text-foreground ${t.status === "DONE" ? "line-through" : ""}`}>
                      {t.title}
                    </p>
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.MED}`}>
                      {t.priority}
                    </span>
                    {t.category && (
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-card/60 text-muted-foreground">
                        {t.category.toLowerCase().replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-muted-foreground flex-wrap">
                    {t.clientId && clientMap.has(t.clientId) && (
                      <span>↳ {clientMap.get(t.clientId)}</span>
                    )}
                    {t.dueAt && (
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-rose-400" : ""}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(t.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {isOverdue && " · overdue"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="text-muted-foreground hover:text-rose-400 w-7 h-7 rounded-md hover:bg-card flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>Add something to your firm to-do list.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createTask} className="space-y-3 py-2">
            <div>
              <Label htmlFor="t-title">Title *</Label>
              <Input
                id="t-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Close Acme March books"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="t-desc">Notes</Label>
              <Textarea
                id="t-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details, links, context..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-client">Client</Label>
                <select
                  id="t-client"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
                >
                  <option value="">— firm-wide —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName ?? c.name ?? c.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="t-due">Due date</Label>
                <Input
                  id="t-due"
                  type="date"
                  value={form.dueAt}
                  onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-prio">Priority</Label>
                <select
                  id="t-prio"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
                >
                  <option value="HIGH">High</option>
                  <option value="MED">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <Label htmlFor="t-cat">Category</Label>
                <select
                  id="t-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
                >
                  <option value="">— none —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.toLowerCase().replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !form.title.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {creating ? "Creating..." : "Create task"}
              </Button>
            </DialogFooter>
          </form>
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
