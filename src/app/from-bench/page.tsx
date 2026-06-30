"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight, Check, X, Clock, Shield, Sparkles, GitBranch, FileText,
  Mail, Building2, AlertTriangle, ArrowLeft,
} from "lucide-react";

const TIMELINE = [
  { t: "T+0", title: "Sign up", desc: "30 seconds. No demo call required." },
  { t: "T+10min", title: "Upload last Bench CSV", desc: "Drag-and-drop any month's bank export. Same data Bench had." },
  { t: "T+15min", title: "AI categorizes everything", desc: "Llama 3.3 70B + Gemini classify every transaction. Confidence-scored." },
  { t: "T+1h", title: "Accountant assigned", desc: "Real human reviews categorizations + flags anomalies." },
  { t: "T+24h", title: "First P&L delivered", desc: "Reviewed report in your inbox. Same format as Bench. Better." },
];

const COMPARISON = [
  { feature: "Monthly bookkeeping", bench: true, ledgr: true },
  { feature: "P&L + balance sheet + cash flow", bench: true, ledgr: true },
  { feature: "Dedicated bookkeeper", bench: true, ledgr: true },
  { feature: "Tax-ready financials", bench: true, ledgr: true },
  { feature: "AI categorization (Llama 3.3)", bench: false, ledgr: true },
  { feature: "Live financial AI assistant", bench: false, ledgr: true },
  { feature: "Anomaly detection (fraud, duplicates)", bench: false, ledgr: true },
  { feature: "Runway forecasting on dashboard", bench: false, ledgr: true },
  { feature: "Real-time AR/AP aging", bench: false, ledgr: true },
  { feature: "24-hour onboarding", bench: false, ledgr: true },
  { feature: "Still in business in 2026", bench: false, ledgr: true },
];

export default function BenchMigrationPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    lastBenchMonth: "",
    avgMonthlyTransactions: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.name) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bench-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Got it — we'll be in touch within 2 hours.");
    } catch {
      toast.error("Submission failed. Please email founder@ledgr.app");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500/20">
      {/* nav */}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> ledgr.app
          </Link>
          <Link href="/register?plan=growth">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm h-8">
              Start migration <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-emerald-500/10 via-emerald-500/[0.02] to-transparent blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
            <GitBranch className="h-3 w-3" /> BENCH.CO / MIGRATION
          </span>
          <h1 className="mt-6 font-serif text-5xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
            From Bench to Ledgr
            <br />
            <span className="text-emerald-400">in 24 hours.</span>
          </h1>
          <p className="mt-7 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bench shut down. <span className="text-foreground font-medium">10,000+ businesses lost their bookkeeper overnight.</span>
            {" "}We built Ledgr for exactly this moment. Same service, better tools, AI-native — at a fraction of the price.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#migrate">
              <Button size="lg" className="h-12 px-7 text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-black gap-1.5">
                Start your migration <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#how">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base font-medium border-border hover:border-foreground/40">
                How it works
              </Button>
            </a>
          </div>
          <p className="mt-5 font-mono text-xs text-muted-foreground">
            first_month_free · we_handle_the_migration · no_long_term_contract
          </p>
        </div>
      </section>

      {/* The story */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
                <AlertTriangle className="h-3 w-3" /> WHAT HAPPENED
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Bench was a great service. Then it wasn&apos;t.</h2>
              <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
                <p>Bench scaled a human bookkeeping operation to thousands of small businesses. They got the model right — service, not software. But the unit economics were brutal: <span className="text-foreground">one bookkeeper could only handle so many clients.</span> AI wasn&apos;t ready when they started.</p>
                <p>In late 2024, Bench shut down. <span className="text-foreground font-medium">10,000+ small businesses lost their books overnight.</span> Some lost monthly reports mid-cycle. Tax season showed up anyway.</p>
                <p className="text-foreground">Ledgr is what Bench would have looked like if it started in 2026, with Llama 3.3 70B doing 90% of the work, and human accountants doing the last mile.</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">cost_comparison</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Bench (Essential plan)</span>
                  <span className="font-mono text-lg text-rose-400">$299/mo</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Traditional bookkeeper</span>
                  <span className="font-mono text-lg text-rose-400">$1,200–$2,000/mo</span>
                </div>
                <div className="border-t border-border/60 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-medium text-foreground">Ledgr (Starter)</span>
                  <span className="font-mono text-2xl font-bold text-emerald-400">$299/mo</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  · Same service depth as Bench
                  <br />· Plus AI assistant + financials dashboard
                  <br />· First month free for Bench refugees
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="how" className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
            <Clock className="h-3 w-3" /> MIGRATION TIMELINE
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">24 hours, end to end.</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            No demo calls. No multi-week onboarding. Drop your last Bench export and you&apos;ll have a real human reviewing your books before tomorrow.
          </p>

          <ol className="mt-10 relative border-l border-border/60 ml-3 space-y-7">
            {TIMELINE.map((step) => (
              <li key={step.t} className="pl-8 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-background" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">{step.t}</p>
                <p className="font-semibold text-foreground mt-1">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
            <FileText className="h-3 w-3" /> FEATURE PARITY
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Everything you had at Bench. Plus the AI-native parts.</h2>

          <div className="mt-9 rounded-lg border border-border/60 bg-card/60 overflow-hidden">
            <table className="w-full">
              <thead className="bg-card border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">feature</th>
                  <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-28">bench</th>
                  <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-emerald-400 w-28">ledgr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-4 py-3 text-sm text-foreground">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {row.bench ? <Check className="h-4 w-4 text-muted-foreground/60 mx-auto" /> : <X className="h-4 w-4 text-rose-500/60 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Migration form */}
      <section id="migrate" className="border-b border-border/60">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
            <Shield className="h-3 w-3" /> START YOUR MIGRATION
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Tell us about your business.</h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;ll respond within 2 hours with a migration plan tailored to your last Bench setup. First month free.
          </p>

          {done ? (
            <div className="mt-9 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
              <Check className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
              <h3 className="text-lg font-semibold">We&apos;ve got your details.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A real human (not a bot) will reply within 2 hours with the next steps. Check{" "}
                <span className="font-mono text-foreground">{form.email}</span>.
              </p>
              <div className="mt-5">
                <Link href="/register?plan=growth">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                    Skip the queue — sign up now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-9 rounded-xl border border-border/60 bg-card/60 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="name" className="text-xs font-medium text-foreground mb-1.5 block">Your name *</label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="text-xs font-medium text-foreground mb-1.5 block">Email *</label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@acme.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="company" className="text-xs font-medium text-foreground mb-1.5 block">
                  Business name
                </label>
                <div className="relative">
                  <Building2 className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Acme Inc."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lastBench" className="text-xs font-medium text-foreground mb-1.5 block">
                    Last Bench month <span className="text-muted-foreground">(approx)</span>
                  </label>
                  <Input
                    id="lastBench"
                    value={form.lastBenchMonth}
                    onChange={(e) => setForm({ ...form, lastBenchMonth: e.target.value })}
                    placeholder="e.g. Nov 2024"
                  />
                </div>
                <div>
                  <label htmlFor="txns" className="text-xs font-medium text-foreground mb-1.5 block">
                    Avg monthly transactions
                  </label>
                  <Input
                    id="txns"
                    value={form.avgMonthlyTransactions}
                    onChange={(e) => setForm({ ...form, avgMonthlyTransactions: e.target.value })}
                    placeholder="e.g. 200"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="text-xs font-medium text-foreground mb-1.5 block">
                  Anything we should know? <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Multi-entity, foreign currency, specific tax filings..."
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold h-11">
                {submitting ? "Submitting..." : <>Submit migration request <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center font-mono">
                we_respond_within_2_hours · no_demo_call_required · first_month_free
              </p>
            </form>
          )}
        </div>
      </section>

      {/* footer */}
      <footer className="bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center">
              <span className="text-background font-black text-[9px]">L</span>
            </div>
            <span className="font-semibold text-foreground">ledgr</span>
            <span className="text-xs">· AI-native accounting firm</span>
          </div>
          <p className="font-mono text-xs">questions? hello@ledgr.app</p>
        </div>
      </footer>
    </div>
  );
}
