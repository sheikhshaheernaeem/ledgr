"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserCog, Send, Loader2, FileText, CheckCircle2, Clock, AlertCircle,
  Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Request {
  id: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  createdAt: string;
  allocatedAt: string | null;
  completedAt: string | null;
  assignedToName?: string | null;
  deliverableUrl?: string | null;
}

const CATEGORIES = [
  { value: "TAX_PREP", label: "Tax preparation" },
  { value: "AUDIT", label: "Audit assistance" },
  { value: "BOARD_PACKAGE", label: "Board package" },
  { value: "LOAN_DOCS", label: "Loan documentation" },
  { value: "BOOKKEEPING_REVIEW", label: "Bookkeeping review" },
  { value: "FINANCIAL_PLANNING", label: "Financial planning" },
  { value: "OTHER", label: "Something else" },
];

const URGENCIES = [
  { value: "LOW", label: "Low — within 2 weeks" },
  { value: "MED", label: "Medium — within 1 week" },
  { value: "HIGH", label: "High — within 48 hours" },
];

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  ALLOCATED: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  IN_PROGRESS: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  COMPLETED: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  CANCELLED: "text-muted-foreground border-border bg-background/60",
};

export function HumanAccountantRequest() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TAX_PREP");
  const [urgency, setUrgency] = useState("MED");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/client/service-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      // silent
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Add a title and a brief description");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/client/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, urgency }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit");
      }
      toast.success("Request sent to admin — an accountant will be assigned soon");
      setTitle("");
      setDescription("");
      setCategory("TAX_PREP");
      setUrgency("MED");
      void loadRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
          <UserCog className="h-3 w-3" /> HUMAN_ACCOUNTANT
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Send to a real accountant.</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          When AI isn&apos;t enough — audits, complex tax filings, judgment calls. Your request
          goes to our admin who assigns the right accountant. Reply within 24 hours.
        </p>
      </div>

      {/* New request form */}
      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-4">
        <div>
          <Label htmlFor="hr-title">What do you need?</Label>
          <Input
            id="hr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Prepare Q1 federal estimated tax"
            className="mt-1.5"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="hr-cat">Category</Label>
            <select
              id="hr-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="hr-urgency">Urgency</Label>
            <select
              id="hr-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
            >
              {URGENCIES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="hr-desc">Describe the work</Label>
          <Textarea
            id="hr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Give the accountant context. Documents, deadlines, special considerations…"
            rows={4}
            className="mt-1.5"
            required
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground font-mono">
            <Sparkles className="h-3 w-3 inline mr-1" />
            tip: try the AI lane first — most work is instant
          </p>
          <Button type="submit" disabled={submitting} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold">
            {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />sending…</> : <><Send className="h-3.5 w-3.5 mr-1.5" />Send to accountant</>}
          </Button>
        </div>
      </form>

      {/* Past requests */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> your_requests · {requests.length}
          </p>
          <Link href="/client/requests" className="font-mono text-[10px] uppercase tracking-wider text-blue-500 hover:text-blue-400 flex items-center gap-1">
            view_all <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <UserCog className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No requests yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Submit one above and an accountant will reach out.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id} className="p-4 hover:bg-card/60">
                <div className="flex items-start gap-3">
                  <StatusIcon status={r.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      <span className={`font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 rounded ${STATUS_STYLE[r.status] ?? "text-muted-foreground border-border"}`}>
                        {r.status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground mt-1">
                      {r.category.toLowerCase().replace(/_/g, " ")} · {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.assignedToName && ` · with ${r.assignedToName}`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /></div>;
  if (status === "IN_PROGRESS" || status === "ALLOCATED") return <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0"><Clock className="h-3.5 w-3.5 text-blue-500" /></div>;
  if (status === "OPEN") return <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0"><AlertCircle className="h-3.5 w-3.5 text-amber-500" /></div>;
  return <div className="w-7 h-7 rounded-md bg-card border border-border flex items-center justify-center shrink-0"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></div>;
}
