"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, FileCheck, Plus, X, Loader2, CheckCircle2, Clock, Send } from "lucide-react";

interface DocReqItem {
  label: string;
  status: "pending" | "submitted" | "approved";
}

interface DocRequest {
  id: string;
  title: string;
  description: string | null;
  itemsJson: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  OPEN: "border-amber-500/40 bg-amber-500/[0.08] text-amber-400",
  PARTIAL: "border-blue-500/40 bg-blue-500/[0.08] text-blue-400",
  COMPLETE: "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400",
  CANCELLED: "border-rose-500/40 bg-rose-500/[0.04] text-rose-400",
};

export default function DocRequestsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueAt: "",
    items: ["", ""],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/doc-requests?clientId=${clientId}`);
      if (!res.ok) throw new Error();
      setRequests(await res.json());
    } catch {
      toast.error("Failed to load");
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function approveItem(reqId: string, idx: number) {
    await fetch(`/api/firm/doc-requests/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIndex: idx, itemStatus: "approved" }),
    });
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const items = form.items.filter((i) => i.trim()).map((label) => ({ label: label.trim() }));
    if (!form.title.trim() || items.length === 0) {
      toast.error("Title and at least one item required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/firm/doc-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: form.title,
          description: form.description || undefined,
          items,
          dueAt: form.dueAt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Document request sent to client");
      setForm({ title: "", description: "", dueAt: "", items: ["", ""] });
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to create");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Link href={`/firm/${clientId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        <ArrowLeft className="h-3 w-3" /> back to workspace
      </Link>

      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <FileCheck className="h-3 w-3" /> firm / document_requests
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Document requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask the client for specific documents. They check items off as they upload.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New request
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <FileCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No document requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click &ldquo;New request&rdquo; to ask the client for receipts, statements, or contracts.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const items: DocReqItem[] = JSON.parse(r.itemsJson);
            const approved = items.filter((i) => i.status === "approved").length;
            const submitted = items.filter((i) => i.status === "submitted").length;
            return (
              <li key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      created {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.dueAt && ` · due ${new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle[r.status] ?? statusStyle.OPEN}`}>
                    {r.status.toLowerCase()} · {approved}/{items.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((it, idx) => {
                    const Icon = it.status === "approved" ? CheckCircle2 : it.status === "submitted" ? Send : Clock;
                    return (
                      <li key={idx} className="flex items-center gap-2 text-sm py-1">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${
                          it.status === "approved" ? "text-emerald-400" :
                          it.status === "submitted" ? "text-blue-400" :
                          "text-muted-foreground"
                        }`} />
                        <span className={`flex-1 ${it.status === "approved" ? "text-foreground" : "text-muted-foreground"}`}>
                          {it.label}
                        </span>
                        {it.status === "submitted" && (
                          <button onClick={() => approveItem(r.id, idx)} className="text-xs font-mono text-emerald-400 hover:text-emerald-300">
                            approve →
                          </button>
                        )}
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{it.status}</span>
                      </li>
                    );
                  })}
                </ul>
                {submitted > 0 && (
                  <p className="text-xs text-blue-400 mt-2 font-mono">{submitted} item{submitted > 1 ? "s" : ""} waiting for your review</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New document request</DialogTitle>
            <DialogDescription>The client sees this as a checklist in their portal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3 py-2">
            <div>
              <Label htmlFor="dr-title">Title *</Label>
              <Input id="dr-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. March receipts & Stripe statements" required />
            </div>
            <div>
              <Label htmlFor="dr-desc">Description</Label>
              <Textarea id="dr-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Context, instructions..." rows={2} />
            </div>
            <div>
              <Label htmlFor="dr-due">Due date</Label>
              <Input id="dr-due" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </div>
            <div>
              <Label>Items to request</Label>
              <div className="space-y-2 mt-1.5">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => i === j ? e.target.value : x) })}
                      placeholder={i === 0 ? "e.g. March bank statement" : "another item"}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
                      disabled={form.items.length <= 1}
                      className="w-9 h-9 rounded-md border border-border bg-card/60 text-muted-foreground hover:text-rose-400 disabled:opacity-30 flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, ""] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add item
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "Sending..." : "Send to client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
