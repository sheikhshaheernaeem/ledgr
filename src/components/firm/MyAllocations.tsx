"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Clipboard, Clock, ArrowRight, CheckCircle2, Upload, Loader2, ExternalLink,
} from "lucide-react";

interface Req {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  category: string;
  urgency: string;
  status: string;
  allocatedAt: string | null;
  dueAt: string | null;
}
interface Client { id: string; name: string | null; email: string; companyName: string | null }

const urgencyStyle: Record<string, string> = {
  HIGH: "text-rose-400",
  MED: "text-amber-400",
  LOW: "text-muted-foreground",
};

export function MyAllocations() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Req | null>(null);
  const [note, setNote] = useState("");
  const [deliverableType, setDeliverableType] = useState("report");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/firm/my-allocations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests ?? []);
      const m = new Map<string, string>();
      for (const c of (data.clients ?? []) as Client[]) {
        m.set(c.id, c.companyName ?? c.name ?? c.email);
      }
      setClients(m);
    } catch {
      // silent — non-blocking on Queue page
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    if (!completing) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("requestId", completing.id);
      if (note.trim()) fd.append("note", note.trim());
      fd.append("deliverableType", deliverableType);
      const file = fileInputRef.current?.files?.[0];
      if (file) fd.append("file", file);

      const res = await fetch("/api/firm/complete-request", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      toast.success("Delivered to client");
      setCompleting(null);
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  }

  if (loading || requests.length === 0) return null;

  return (
    <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/[0.06] flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Clipboard className="h-3 w-3" /> my_allocations · {requests.length}
        </p>
      </div>

      <ul className="divide-y divide-border/40">
        {requests.map((r) => {
          const overdue = r.dueAt && new Date(r.dueAt) < new Date();
          return (
            <li key={r.id} className="p-4 flex items-start gap-3 hover:bg-card/30">
              <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                <Clock className={`h-4 w-4 ${overdue ? "text-rose-400" : "text-emerald-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[r.urgency] ?? ""}`}>
                    ● {r.urgency.toLowerCase()}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-card/60 text-muted-foreground px-1.5 py-0.5 rounded">
                    {r.category.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                  <Link href={`/firm/${r.clientId}`} className="hover:text-foreground inline-flex items-center gap-1">
                    ↳ {clients.get(r.clientId) ?? "client"} <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                  {r.dueAt && (
                    <span className={overdue ? "text-rose-400" : ""}>
                      due {new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {overdue && " · overdue"}
                    </span>
                  )}
                </div>
                {/* Quick links to relevant tools on client workspace */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <ToolLink href={`/firm/${r.clientId}?tab=reports`} label="reports" />
                  <ToolLink href={`/firm/${r.clientId}?tab=transactions`} label="txns" />
                  <ToolLink href={`/firm/${r.clientId}/journal`} label="journal" />
                  <ToolLink href={`/firm/${r.clientId}/reconcile`} label="reconcile" />
                  <ToolLink href={`/firm/${r.clientId}?tab=anomalies`} label="anomalies" />
                  <ToolLink href={`/firm/${r.clientId}?tab=notes`} label="message client" />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setCompleting(r)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Complete
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Complete dialog */}
      <Dialog open={!!completing} onOpenChange={(open) => { if (!open) { setCompleting(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliver completed work</DialogTitle>
            <DialogDescription>
              Upload your deliverable. It goes straight to the client&apos;s portal, the request closes, and the client gets a message.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={complete} className="space-y-3 py-2">
            {completing && (
              <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
                <p className="font-medium text-foreground">{completing.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">↳ {clients.get(completing.clientId) ?? "client"}</p>
              </div>
            )}
            <div>
              <Label htmlFor="cr-type">Deliverable type</Label>
              <select
                id="cr-type"
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value)}
                className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                <option value="report">Report</option>
                <option value="tax_filing">Tax filing</option>
                <option value="audit">Audit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="cr-file">Attach deliverable file</Label>
              <input
                id="cr-file"
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx"
                className="mt-1.5 w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-emerald-500 file:text-black file:font-semibold file:cursor-pointer file:text-xs"
              />
              <p className="text-[11px] text-muted-foreground font-mono mt-1">PDF / image / docx / csv · max 5MB</p>
            </div>
            <div>
              <Label htmlFor="cr-note">Notes for the client</Label>
              <Textarea
                id="cr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional. e.g. Here's your Q1 estimate. Pay by Apr 15."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleting(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />delivering…</> : <><Upload className="h-3.5 w-3.5 mr-1.5" />Deliver to client</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider border border-border bg-background hover:border-emerald-500/40 hover:text-emerald-400 text-muted-foreground px-2 py-0.5 rounded transition-colors"
    >
      {label} <ArrowRight className="h-2.5 w-2.5" />
    </Link>
  );
}
