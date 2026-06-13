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
import { TrendingUp, Plus, Trash2, Loader2, Mail, Phone, Building2 } from "lucide-react";

interface Lead {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string | null;
  stage: string;
  estimatedMrr: number | null;
  notes: string | null;
  convertedAt: string | null;
  createdAt: string;
}

const STAGES = ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"] as const;
const STAGE_STYLE: Record<string, string> = {
  NEW: "border-blue-500/40 bg-blue-500/[0.08]",
  CONTACTED: "border-amber-500/40 bg-amber-500/[0.08]",
  PROPOSAL: "border-violet-500/40 bg-violet-500/[0.08]",
  WON: "border-emerald-500/40 bg-emerald-500/[0.08]",
  LOST: "border-rose-500/40 bg-rose-500/[0.04]",
};
const STAGE_TEXT: Record<string, string> = {
  NEW: "text-blue-400",
  CONTACTED: "text-amber-400",
  PROPOSAL: "text-violet-400",
  WON: "text-emerald-400",
  LOST: "text-rose-400",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", companyName: "",
    source: "website", estimatedMrr: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/firm/leads");
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      toast.error("Failed to load pipeline");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/firm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedMrr: form.estimatedMrr ? parseFloat(form.estimatedMrr) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead created");
      setForm({ name: "", email: "", phone: "", companyName: "", source: "website", estimatedMrr: "", notes: "" });
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to create");
    } finally { setSaving(false); }
  }

  async function moveStage(id: string, stage: string) {
    try {
      const res = await fetch(`/api/firm/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/firm/leads/${id}`, { method: "DELETE" });
    load();
  }

  const byStage = STAGES.reduce<Record<string, Lead[]>>((acc, s) => {
    acc[s] = leads.filter((l) => l.stage === s);
    return acc;
  }, {});

  const pipelineMrr = leads
    .filter((l) => l.stage !== "LOST" && l.stage !== "WON" && l.estimatedMrr)
    .reduce((s, l) => s + (l.estimatedMrr ?? 0), 0);
  const wonMrr = leads
    .filter((l) => l.stage === "WON" && l.estimatedMrr)
    .reduce((s, l) => s + (l.estimatedMrr ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> firm / pipeline
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prospective clients — track from first contact to onboarding.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New lead
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="open_leads" value={(byStage.NEW.length + byStage.CONTACTED.length + byStage.PROPOSAL.length).toString()} />
        <Stat label="pipeline_mrr" value={fmt(pipelineMrr)} color="text-amber-400" />
        <Stat label="won_mrr" value={fmt(wonMrr)} color="text-emerald-400" />
        <Stat label="total_leads" value={leads.length.toString()} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <section key={stage} className={`rounded-lg border ${STAGE_STYLE[stage]} overflow-hidden`}>
              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                <p className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${STAGE_TEXT[stage]}`}>{stage.toLowerCase()}</p>
                <span className="font-mono text-[10px] text-muted-foreground">{byStage[stage].length}</span>
              </div>
              <ul className="p-2 space-y-2 min-h-[200px]">
                {byStage[stage].length === 0 ? (
                  <li className="text-center py-6 text-[11px] font-mono text-muted-foreground/60">empty</li>
                ) : (
                  byStage[stage].map((lead) => (
                    <li key={lead.id} className="rounded-md border border-border/60 bg-background p-2.5 group">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-foreground truncate flex-1">{lead.name}</p>
                        <button onClick={() => del(lead.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {lead.companyName && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{lead.companyName}</p>
                      )}
                      <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] font-mono text-muted-foreground">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 truncate hover:text-foreground">
                            <Mail className="h-2.5 w-2.5 shrink-0" />{lead.email}
                          </a>
                        )}
                        {lead.estimatedMrr && (
                          <span className="text-emerald-400">~{fmt(lead.estimatedMrr)}/mo</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {STAGES.filter((s) => s !== stage).map((s) => (
                          <button
                            key={s}
                            onClick={() => moveStage(lead.id, s)}
                            className={`text-[9px] font-mono uppercase border border-border bg-card/60 hover:border-emerald-500/30 hover:text-emerald-400 px-1.5 py-0.5 rounded`}
                          >
                            → {s.slice(0, 3).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* New lead dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
            <DialogDescription>Add a prospect to your pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="l-name">Name *</Label>
                <Input id="l-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <Label htmlFor="l-co">Company</Label>
                <Input id="l-co" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="l-email">Email</Label>
                <Input id="l-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="l-phone">Phone</Label>
                <Input id="l-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="l-src">Source</Label>
                <select id="l-src" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                  <option value="website">Website</option>
                  <option value="bench_refugee">Bench refugee</option>
                  <option value="referral">Referral</option>
                  <option value="partner">Partner</option>
                  <option value="cold_outbound">Cold outbound</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="l-mrr">Estimated MRR</Label>
                <Input id="l-mrr" type="number" value={form.estimatedMrr} onChange={(e) => setForm({ ...form, estimatedMrr: e.target.value })} placeholder="299" />
              </div>
            </div>
            <div>
              <Label htmlFor="l-notes">Notes</Label>
              <Textarea id="l-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "Saving..." : "Create lead"}
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
