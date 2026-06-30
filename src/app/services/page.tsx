import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Zap, FileText, Brain, TrendingUp, Shield, BarChart3, Receipt,
  ArrowRight, Check, Sparkles,
} from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";

const SERVICES = [
  {
    icon: Zap,
    title: "Monthly bookkeeping",
    desc: "Every transaction categorized, every account reconciled, every report reviewed — delivered by the 5th of every month.",
    includes: ["Bank statement parsing", "AI categorization", "Reconciliation", "Human review"],
  },
  {
    icon: FileText,
    title: "P&L + financial reports",
    desc: "Profit & loss, balance sheet, cash flow — prepared, formatted, and emailed to your inbox.",
    includes: ["Monthly P&L", "Balance sheet", "Cash flow statement", "AR / AP aging"],
  },
  {
    icon: Brain,
    title: "AI financial intelligence",
    desc: "Llama 3.3 70B + FinBERT-class sentiment models with live access to your numbers. Ask anything.",
    includes: ["Live AI accountant chat", "Sentiment on statements", "Trend extraction", "Anomaly detection"],
  },
  {
    icon: Receipt,
    title: "Tax preparation",
    desc: "Books kept tax-ready all year. Quarterly estimates, year-end close, federal & state filings.",
    includes: ["Quarterly estimates", "Year-end close", "Federal + state filing", "Deduction tracking"],
  },
  {
    icon: Shield,
    title: "Human expert review",
    desc: "Every report touched by a real accountant before it reaches you. AI lifts heavy; humans ensure accuracy.",
    includes: ["Per-report review", "Anomaly resolution", "Judgment calls", "Strategic guidance"],
  },
  {
    icon: BarChart3,
    title: "Cash flow forecasting",
    desc: "We model your runway, flag concerns early, surface insights so you can decide with data.",
    includes: ["13-week forecast", "Runway models", "Scenario planning", "Burn analysis"],
  },
];

const TIERS = [
  { name: "Starter", price: 299, desc: "Freelancers & solopreneurs" },
  { name: "Growth", price: 599, desc: "Small businesses $10K–$100K/mo" },
  { name: "CFO", price: 1499, desc: "Growing companies needing more" },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-radial from-blue-500/10 via-blue-500/[0.02] to-transparent blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-blue-500 dark:text-blue-400">
            <Sparkles className="h-3 w-3" /> SERVICES
          </span>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.02em] leading-[1.05]">
            Six services we perform
            <br />
            <span className="text-blue-500 dark:text-blue-400">so you don&apos;t have to.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Not features in software. Services we perform — every month, end-to-end,
            reviewed by an expert accountant before it reaches you.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-xl border border-border/60 bg-card/40 p-6 hover:border-blue-500/30 hover:bg-card/60 transition-colors">
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center mb-4">
                  <s.icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground text-base mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                <ul className="mt-4 pt-4 border-t border-border/40 space-y-1.5">
                  {s.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-blue-500 dark:text-blue-400">
              <TrendingUp className="h-3 w-3" /> PRICING
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Service pricing.
            </h2>
            <p className="mt-3 text-muted-foreground">
              All plans include every service above — they differ by transaction volume and SLA.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TIERS.map((t) => (
              <div key={t.name} className="rounded-xl border border-border/60 bg-card p-6 text-center">
                <h3 className="font-semibold text-foreground text-lg">{t.name}</h3>
                <p className="text-3xl font-bold text-foreground mt-2">${t.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-2">{t.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/register">
              <Button size="lg" className="h-11 px-7 bg-blue-500 hover:bg-blue-400 text-white font-semibold gap-1.5">
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 font-mono text-xs text-muted-foreground">first_month_free · no_credit_card · cancel_anytime</p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
