"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Inbox, FileCheck, Plus, Upload, CheckCircle2, Clock, Send, Loader2,
  FileText, AlertTriangle, Sparkles, X,
} from "lucide-react";

interface DocReqItem {
  label: string;
  status: "pending" | "submitted" | "approved";
  docId?: string;
}
interface DocRequest {
  id: string;
  title: string;
  description: string | null;
  itemsJson: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
}
interface ServiceRequest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  urgency: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  allocatedAt: string | null;
  deliverableUrl: string | null;
  deliverableNote: string | null;
  deliverableType: string | null;
}
interface PendingReport {
  id: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  sentAt: string | null;
  clientApprovalToken: string | null;
}

const CATEGORIES = [
  { value: "TAX_PREP", label: "Tax preparation" },
  { value: "BOARD_PACKAGE", label: "Board / investor package" },
  { value: "LOAN_DOCS", label: "Loan / financing docs" },
  { value: "AUDIT", label: "Audit support" },
  { value: "OTHER", label: "Other" },
];

const statusStyle: Record<string, string> = {
  OPEN: "border-amber-500/40 bg-amber-500/[0.08] text-amber-400",
  PARTIAL: "border-blue-500/40 bg-blue-500/[0.08] text-blue-400",
  IN_PROGRESS: "border-blue-500/40 bg-blue-500/[0.08] text-blue-400",
  COMPLETE: "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

export default function ClientRequestsPage() {
  const [docRequests, setDocRequests] = useState<DocRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<{ requestId: string; itemIndex: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "TAX_PREP", urgency: "MED", dueAt: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [drlRes, srRes, repRes] = await Promise.all([
        fetch("/api/firm/doc-requests"),
        fetch("/api/client/service-requests"),
        fetch("/api/client/pending-reports"),
      ]);
      if (drlRes.ok) setDocRequests(await drlRes.json());
      if (srRes.ok) setMyRequests(await srRes.json());
      if (repRes.ok) setPendingReports(await repRes.json());
    } catch {
      toast.error("Failed to load");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function submitItem(requestId: string, itemIndex: number) {
    // Trigger file picker
    setUploadFor({ requestId, itemIndex });
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadFor) return;
    setUploading(true);
    try {
      // 1. Upload the document
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "RECEIPT");
      const upRes = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!upRes.ok) throw new Error();

      // 2. Mark item submitted
      await fetch(`/api/firm/doc-requests/${uploadFor.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIndex: uploadFor.itemIndex, itemStatus: "submitted" }),
      });

      toast.success("Item submitted to your accountant");
      load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setUploadFor(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/client/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Request sent to your accountant");
      setForm({ title: "", description: "", category: "TAX_PREP", urgency: "MED", dueAt: "" });
      setRequestOpen(false);
      load();
    } catch {
      toast.error("Failed to send request");
    } finally { setSaving(false); }
  }

  const openDocReqs = docRequests.filter((d) => d.status !== "COMPLETE" && d.status !== "CANCELLED");
  const openSvcReqs = myRequests.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED");
  const totalOpen = openDocReqs.length + openSvcReqs.length + pendingReports.length;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileSelected}
        className="hidden"
        accept="image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx"
      />

      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Inbox className="h-3 w-3" /> requests
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Service requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What your firm needs from you, and what you can ask your firm for.
          </p>
        </div>
        <Button onClick={() => setRequestOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Request work
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : totalOpen === 0 && myRequests.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto mb-3" />
          <p className="font-medium text-foreground">Inbox clear</p>
          <p className="text-sm text-muted-foreground mt-1">Nothing waiting on you. Use &ldquo;Request work&rdquo; to ask the firm for something.</p>
        </div>
      ) : (
        <>
          {/* Reports awaiting approval */}
          {pendingReports.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                reports_to_approve · {pendingReports.length}
              </h2>
              {pendingReports.map((r) => (
                <Link
                  key={r.id}
                  href={r.clientApprovalToken ? `/p/report/${r.clientApprovalToken}` : "/client/reports"}
                  className="block rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-4 hover:bg-amber-500/[0.08] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{monthName(r.month, r.year)} report</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        revenue {fmt(r.totalIncome)} · expenses {fmt(r.totalExpenses)} · net {fmt(r.netProfit)}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/[0.08] text-amber-400">
                      review →
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {/* Document requests from firm */}
          {openDocReqs.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                from_your_firm · {openDocReqs.length}
              </h2>
              {openDocReqs.map((r) => {
                const items: DocReqItem[] = JSON.parse(r.itemsJson);
                const submittedCount = items.filter((i) => i.status !== "pending").length;
                return (
                  <div key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-foreground">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                        {r.dueAt && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-1">
                            due {new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle[r.status] ?? statusStyle.OPEN}`}>
                        {submittedCount}/{items.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((it, idx) => {
                        const isPending = it.status === "pending";
                        return (
                          <li key={idx} className="flex items-center gap-2 text-sm py-1.5 border-t border-border/40 first:border-0">
                            {it.status === "approved" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : it.status === "submitted" ? (
                              <Send className="h-4 w-4 text-blue-400 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="flex-1 text-foreground">{it.label}</span>
                            {isPending && (
                              <button
                                onClick={() => submitItem(r.id, idx)}
                                disabled={uploading}
                                className="inline-flex items-center gap-1 text-xs font-mono text-emerald-500 hover:text-emerald-400 border border-emerald-500/40 bg-emerald-500/[0.05] hover:bg-emerald-500/10 px-2 py-1 rounded"
                              >
                                <Upload className="h-3 w-3" /> upload
                              </button>
                            )}
                            {it.status !== "pending" && (
                              <span className="font-mono text-[10px] uppercase text-muted-foreground">{it.status}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}

          {/* My requests to firm */}
          {myRequests.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                your_requests · {myRequests.length}
              </h2>
              {myRequests.map((r) => (
                <div key={r.id} className={`rounded-lg border p-4 ${
                  r.status === "COMPLETED" ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-border/60 bg-card/40"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{r.title}</p>
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle[r.status] ?? "border-border bg-card/60 text-muted-foreground"}`}>
                          {r.status.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{r.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground flex-wrap">
                        <span>{r.category.toLowerCase().replace(/_/g, " ")}</span>
                        <span>{r.urgency.toLowerCase()} priority</span>
                        <span>opened {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {r.assignedToName && (
                          <span className="text-emerald-400">↳ allocated to {r.assignedToName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deliverable when completed */}
                  {r.status === "COMPLETED" && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        delivered · {r.completedAt && new Date(r.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {r.deliverableNote && (
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{r.deliverableNote}</p>
                      )}
                      {r.deliverableUrl && (
                        <a
                          href={r.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-1.5 rounded"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Download deliverable ({r.deliverableType?.replace(/_/g, " ") ?? "file"})
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {/* New request dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request work from your firm</DialogTitle>
            <DialogDescription>
              Tell your accountant what you need. They&apos;ll respond and route it to the right person.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRequest} className="space-y-3 py-2">
            <div>
              <Label htmlFor="sr-cat">What do you need?</Label>
              <select
                id="sr-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="sr-title">Title *</Label>
              <Input
                id="sr-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Prepare Q1 federal estimated tax"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="sr-desc">Details</Label>
              <Textarea
                id="sr-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Context, due dates, what success looks like..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sr-urg">Urgency</Label>
                <select id="sr-urg" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                  <option value="LOW">Low — whenever</option>
                  <option value="MED">Normal</option>
                  <option value="HIGH">High — urgent</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sr-due">Need by</Label>
                <Input id="sr-due" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "Sending..." : "Send to firm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
