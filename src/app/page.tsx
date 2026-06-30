"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Fragment, useRef, useState } from "react";
import {
  ArrowRight, Check, TrendingUp, Shield, Clock,
  BarChart3, FileText, Zap, Brain, Users, Star, ChevronRight, Terminal, Code2, GitBranch, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = (d = 0.07) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} variants={fadeUp} initial="hidden"
      animate={inView ? "show" : "hidden"} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}

function Stagger({ children, className = "", delay = 0.07 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} variants={stagger(delay)} initial="hidden"
      animate={inView ? "show" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

function MotionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/* GitHub-style mono label */
function MonoLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-emerald-400">
      {Icon ? <Icon className="h-3 w-3" /> : <span className="w-1.5 h-1.5 bg-emerald-400 rounded-sm" />}
      {children}
    </span>
  );
}

/* ── data ── */
const services = [
  { icon: Zap,        title: "Monthly Bookkeeping",       desc: "We categorize every transaction, reconcile your accounts, and deliver clean books by the 5th of every month." },
  { icon: FileText,   title: "P&L + Financial Reports",   desc: "Profit & loss, balance sheet, and cash flow — prepared, reviewed, and delivered without you lifting a finger." },
  { icon: Brain,      title: "AI Financial Intelligence", desc: "Ask Ledgr AI anything. Get real answers backed by your live data, not generic chatbot advice." },
  { icon: TrendingUp, title: "Tax Preparation",           desc: "Books organized year-round so tax season isn't a crisis. We handle prep, you review and approve." },
  { icon: Shield,     title: "Human Expert Review",       desc: "Every report reviewed by a real accountant before it reaches you. AI lifts heavy. Humans ensure accuracy." },
  { icon: BarChart3,  title: "Cash Flow Forecasting",     desc: "We model your runway, flag issues early, and surface insights so you make decisions with data." },
];

const pricingBookkeeping = [
  { name: "Basic", price: 299, desc: "Very small businesses · low volume", slug: "starter",
    features: [
      "Up to 100 transactions/month",
      "Manual bookkeeping by human",
      "Monthly financial reports",
      "Basic expense categorization",
      "3–7 day turnaround",
    ],
    cta: "Start free", hot: false },
  { name: "Pro", price: 599, desc: "Small businesses scaling operations", slug: "growth",
    features: [
      "Up to 500 transactions/month",
      "Manual bookkeeping",
      "Weekly updates",
      "Categorized expense tracking",
      "Improved accuracy checks",
      "1–3 day turnaround",
    ],
    cta: "Start free", hot: true },
  { name: "Advanced", price: 1499, desc: "Businesses needing human oversight", slug: "cfo",
    features: [
      "High transaction volume support",
      "Dedicated bookkeeper",
      "Real-time transaction updates",
      "Tax-ready financial reports",
      "Custom reporting support",
      "Same-day / near real-time updates",
    ],
    cta: "Talk to us", hot: false },
];

const pricingAiAccountant = [
  { name: "Starter AI", price: 999, desc: "Freelancers & small businesses starting automation", slug: "ai-starter",
    features: [
      "Up to 200 documents/month",
      "AI-powered automatic bookkeeping (no manual entry)",
      "Smart transaction categorization (auto-learns)",
      "Real-time financial dashboard",
      "Basic P&L reports",
      "~80% autonomous",
      "Standard queue · 30–90 sec / document",
    ],
    cta: "Start free", hot: false },
  { name: "Growth AI", price: 1999, desc: "Scaling startups & growing businesses", slug: "ai-growth",
    features: [
      "Up to 1,000 documents/month",
      "Multi-source ingestion (uploads, email, integrations)",
      "Full end-to-end AI accounting pipeline",
      "Real-time P&L + cash flow tracking",
      "AI anomaly + duplicate detection",
      "Multi-user access + role permissions",
      "~95% autonomous · Priority queue",
    ],
    cta: "Start free", hot: true },
  { name: "Autonomous AI", price: 2999, desc: "Flagship — replaces human accounting workflows", slug: "ai-cfo",
    features: [
      "Unlimited documents + transactions",
      "100% autonomous · zero manual work",
      "Auto-reconciliation (bank ↔ transactions)",
      "Predictive forecasting + trend analysis",
      "Real-time P&L, balance sheet, cash flow",
      "Self-healing data validation",
      "Tax-ready summaries · Fraud detection",
      "Instant processing (<10s) · Priority SLA",
      "Dedicated onboarding",
    ],
    cta: "Talk to us", hot: false },
];

const addOns = [
  { icon: "plug", name: "Integrations", desc: "Bank sync · Stripe / PayPal · ERP connectors", price: "from $99/mo" },
  { icon: "chart", name: "Advanced Reports Pack", desc: "Balance Sheet · Cash Flow Forecast · Custom KPI dashboards", price: "from $149/mo" },
  { icon: "headset", name: "Dedicated Support", desc: "Account manager · Priority SLA · 1-hour response", price: "from $199/mo" },
];

const comparison = [
  { trad: "Manual work", ai: "Fully automated" },
  { trad: "Delayed reports", ai: "Real-time data" },
  { trad: "Human errors", ai: "AI validation" },
  { trad: "Expensive scaling", ai: "Infinite scalability" },
  { trad: "$3,000+/month per accountant", ai: "24/7 — never sleeps" },
];

const evolution = [
  { era: "v1.0", label: "Outsourced Service", desc: "Hired a bookkeeper. Expensive, slow, opaque.", current: false },
  { era: "v2.0", label: "SaaS Software",      desc: "QuickBooks, Xero. Better tools — you still do the work.", current: false },
  { era: "v3.0", label: "AI Copilot",         desc: "AI-assisted tools. Still software. Still your job.", current: false },
  { era: "v4.0", label: "AI-Native Service",  desc: "We do the work. You get the output. This is Ledgr.", current: true },
];

const stats = [
  { val: "500+", label: "businesses_served" },
  { val: "$50M+", label: "transactions_processed" },
  { val: "99.9%", label: "on_time_delivery" },
  { val: "70%", label: "avg_cost_savings" },
];

type ServiceTier = "ai" | "bookkeeping";

export default function Landing() {
  const [tier, setTier] = useState<ServiceTier>("ai");
  const pricing = tier === "ai" ? pricingAiAccountant : pricingBookkeeping;
  const isAi = tier === "ai";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-emerald-500/20">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-black text-[11px] leading-none">L</span>
              </div>
              <span className="font-semibold text-foreground tracking-tight">ledgr</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
              {[["/services","Services"],["/about","About"],["/contact","Contact"],["#pricing","Pricing"]].map(([href,label])=>(
                <Link key={href} href={href} className="hover:text-foreground transition-colors">{label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm h-8">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* dot grid background */}
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* subtle radial glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-radial from-emerald-500/10 via-emerald-500/[0.02] to-transparent blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <FadeUp>
                <MonoLabel icon={GitBranch}>AI-NATIVE / BOOKKEEPING</MonoLabel>
              </FadeUp>
              <FadeUp delay={0.08}>
                <h1 className="mt-6 font-serif text-5xl sm:text-6xl lg:text-[5.5rem] font-medium tracking-[-0.02em] leading-[1.02]">
                  Your accounting,
                  <br />
                  <span className="text-emerald-500 dark:text-emerald-400 italic">done for you.</span>
                </h1>
              </FadeUp>
              <FadeUp delay={0.16}>
                <p className="mt-7 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
                  Ledgr is an AI-native accounting firm. We handle your books, reports, and tax prep
                  end-to-end — reviewed by expert accountants. Not software you use. A service you receive.
                </p>
              </FadeUp>
              <FadeUp delay={0.24}>
                <div className="mt-9 flex flex-col sm:flex-row gap-3">
                  <Link href="/register?plan=starter">
                    <Button size="lg" className="h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5">
                      Get started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="h-11 px-6 border-border hover:border-foreground/40 font-medium">
                      How it works <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </FadeUp>
              <FadeUp delay={0.32}>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {["First month free", "No credit card", "Setup in 30 min"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />{t}
                    </span>
                  ))}
                </div>
              </FadeUp>
            </div>

            {/* Right: terminal mockup */}
            <FadeUp delay={0.2}>
              <div className="relative">
                {/* glow behind */}
                <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent rounded-2xl blur-xl" />
                {/* terminal */}
                <div className="relative rounded-xl border border-border/80 bg-card/95 shadow-2xl overflow-hidden font-mono text-[13px]">
                  {/* terminal chrome */}
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border/60 bg-muted/30">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">~/ledgr — bash</span>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> live
                    </div>
                  </div>
                  {/* terminal body */}
                  <div className="p-4 space-y-2 leading-relaxed">
                    <TerminalLine prompt user="acme-corp" cmd="ledgr upload statement.csv" delay={0.5} />
                    <TerminalLine output text="✓ Parsed 247 transactions" color="text-emerald-400" delay={1.0} />
                    <TerminalLine output text="✓ Categorized via Llama 3.3 70B (4.2s)" color="text-emerald-400" delay={1.4} />
                    <TerminalLine output text="✓ Human review queued · Sarah K." color="text-emerald-400" delay={1.8} />
                    <div className="h-1" />
                    <TerminalLine prompt user="acme-corp" cmd="ledgr report --month=mar" delay={2.3} />
                    <TerminalLine output text="┌─────────────────────────────┐" color="text-muted-foreground" delay={2.7} />
                    <TerminalLine output text="│  Revenue MTD       $24,800  │" color="text-foreground/80" delay={2.85} />
                    <TerminalLine output text="│  Expenses MTD       $9,340  │" color="text-foreground/80" delay={3.0} />
                    <TerminalLine output text="│  Net profit        $15,460  │" color="text-emerald-400" delay={3.15} />
                    <TerminalLine output text="│  Runway          ~14 months │" color="text-foreground/80" delay={3.30} />
                    <TerminalLine output text="└─────────────────────────────┘" color="text-muted-foreground" delay={3.45} />
                    <TerminalLine output text="↪ P&L emailed to founder@acme.com" color="text-muted-foreground" delay={3.85} />
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-emerald-400">acme-corp</span>
                      <span className="text-muted-foreground">$</span>
                      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
                        className="inline-block w-1.5 h-3.5 bg-foreground/70" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }}
              className="text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-1">{s.val}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Evolution ── */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-14 max-w-2xl">
            <MonoLabel>WHY LEDGR</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              The next step after AI copilots.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              Four generations of accounting. Ledgr is the last: we do the work, you get the result.
            </p>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/60">
            {evolution.map((e) => (
              <MotionCard key={e.era}>
                <div className={`relative h-full p-6 flex flex-col gap-3 ${e.current ? "bg-emerald-500/[0.06]" : "bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[11px] ${e.current ? "text-emerald-400" : "text-muted-foreground"}`}>{e.era}</span>
                    {e.current && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        current
                      </span>
                    )}
                  </div>
                  <p className={`font-semibold text-[15px] ${e.current ? "text-foreground" : "text-foreground/80"}`}>{e.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{e.desc}</p>
                </div>
              </MotionCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-14 max-w-2xl">
            <MonoLabel icon={Code2}>WHAT WE DO</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              Services we perform for you.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              Not features in software. Services we perform — so you never have to.
            </p>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <MotionCard key={s.title}>
                <div className="h-full rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-emerald-500/30 transition-all duration-200 p-6 group">
                  <div className="w-9 h-9 rounded-lg border border-border/80 bg-background flex items-center justify-center mb-5 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/[0.06] transition-colors">
                    <s.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-[15px]">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </MotionCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-14 max-w-2xl">
            <MonoLabel icon={Terminal}>PROCESS</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              Three steps. Then just wait for your books.
            </h2>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: "01", icon: FileText,    title: "Share your data",      desc: "Upload a CSV or connect your bank. 30 minutes. No accountant meetings." },
              { n: "02", icon: Brain,       title: "We do the work",       desc: "AI categorizes and analyses every transaction. Accountants review and finalise." },
              { n: "03", icon: Check,       title: "Get clean financials", desc: "P&L, balance sheet, cash flow delivered by the 5th — reviewed and tax-ready." },
            ].map((s) => (
              <MotionCard key={s.n}>
                <div className="relative h-full p-6 rounded-xl border border-border/60 bg-card/60 hover:border-emerald-500/30 hover:bg-card transition-all duration-200">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-9 h-9 rounded-lg border border-border/80 bg-background flex items-center justify-center">
                      <s.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-[15px]">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </MotionCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── AI callout ── */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <FadeUp>
              <MonoLabel icon={Sparkles}>AI INTELLIGENCE</MonoLabel>
              <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
                AI that actually knows your numbers.
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Ledgr AI runs on Llama 3.3 70B — open-source and built into your account at no extra cost.
                Ask it anything with live access to your actual financial data.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["What's my runway at current burn?","Which expenses are tax deductible?","Do I have overdue invoices?","Summarise my Q2 performance"].map((q) => (
                  <span key={q} className="font-mono text-xs border border-border/80 rounded-md px-2.5 py-1 text-muted-foreground bg-background/60">
                    {q}
                  </span>
                ))}
              </div>
            </FadeUp>

            {/* mock AI chat */}
            <FadeUp delay={0.15}>
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xl">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-muted/30">
                  <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-background" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">Ledgr AI</p>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> live
                  </span>
                </div>
                <div className="p-4 space-y-3.5">
                  <div className="flex justify-end">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-foreground max-w-[80%]">
                      What&apos;s my runway at current burn?
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-background" />
                    </div>
                    <div className="bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-muted-foreground max-w-[85%] leading-relaxed">
                      Based on your <span className="font-mono text-foreground">$15,460</span> net profit this month and current cash of <span className="font-mono text-foreground">$84,200</span>, your runway is <span className="text-emerald-400 font-semibold">~14 months</span> at current burn. No overdue invoices. ✓
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 p-3">
                  <div className="bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-muted-foreground/60">
                    Ask anything about your finances…
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-14 max-w-2xl">
            <MonoLabel>TESTIMONIALS</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              What clients say.
            </h2>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { q: "Switched from Bench after they shut down. Ledgr onboarded us in 2 hours and had our first P&L by the 5th. Absolutely seamless.", name: "Sarah K.", role: "Founder, e-commerce", initials: "SK" },
              { q: "Finally stopped doing my own bookkeeping. The AI catches things my old accountant missed, and it costs 3x less. Genuinely impressed.", name: "Marcus T.", role: "Freelance consultant", initials: "MT" },
              { q: "The AI assistant is the real deal. Asked about my Q2 margins and got a detailed breakdown in seconds, with actual numbers from my books.", name: "Priya L.", role: "SaaS founder", initials: "PL" },
            ].map((t) => (
              <MotionCard key={t.name}>
                <div className="h-full rounded-xl border border-border/60 bg-card/60 p-6 hover:border-border transition-colors">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_,i)=><Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">&ldquo;{t.q}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-foreground">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{t.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </MotionCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-14 max-w-2xl">
            <MonoLabel>AUDIENCE</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              Built for founders done doing their own books.
            </h2>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon:Users,      title:"Founders & freelancers",       desc:"You're running a business, not an accounting department. Hand off your books entirely and get back to work." },
              { icon:TrendingUp, title:"Companies replacing Bench",    desc:"Bench shut down. We're built for exactly this: full accounting service, better AI, lower cost, immediate onboarding." },
              { icon:Clock,      title:"Businesses outsourcing today", desc:"Already paying $1,200–$2,000/month to a bookkeeper? We deliver the same output at a fraction of the cost." },
            ].map((w) => (
              <MotionCard key={w.title}>
                <div className="h-full rounded-xl border border-border/60 bg-card p-6 hover:border-emerald-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg border border-border/80 bg-background flex items-center justify-center mb-5">
                    <w.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-[15px]">{w.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                </div>
              </MotionCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="mb-8 max-w-2xl">
            <MonoLabel>PRICING</MonoLabel>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              Two ways to use Ledgr.
            </h2>
            <p className="mt-4 text-muted-foreground text-base">
              Pick the service tier that fits. Switch later anytime.
            </p>
          </FadeUp>

          {/* Service tier toggle */}
          <FadeUp className="mb-10">
            <div className="inline-flex p-1 bg-card/40 border border-border/60 rounded-xl">
              <button
                onClick={() => setTier("ai")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isAi
                    ? "bg-cyan-500 text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Accountant Services
                </span>
              </button>
              <button
                onClick={() => setTier("bookkeeping")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  !isAi
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Book keeping Services
                </span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-mono">
              {isAi
                ? "ai_accountant · llama_3.3 + finbert · autonomous_pipeline · instant_reports"
                : "book_keeping · human_review · monthly_close · tax_prep · plaid_sync"}
            </p>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pricing.map((plan) => {
              const accentBorder = isAi ? "border-cyan-500/50" : "border-emerald-500/50";
              const accentBg = isAi ? "bg-cyan-500/[0.04]" : "bg-emerald-500/[0.04]";
              const accentBadge = isAi ? "bg-cyan-500 text-black" : "bg-emerald-500 text-black";
              const accentCheck = isAi ? "text-cyan-500 dark:text-cyan-400" : "text-emerald-400";
              const accentBtn = isAi
                ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                : "bg-emerald-500 hover:bg-emerald-400 text-black";
              return (
              <MotionCard key={plan.slug}>
                <div className={`relative h-full flex flex-col rounded-xl border p-7 ${
                  plan.hot
                    ? `${accentBorder} ${accentBg}`
                    : "border-border/60 bg-card/60"
                }`}>
                  {plan.hot && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 ${accentBadge} text-[10px] font-bold px-3 py-0.5 rounded-full font-mono uppercase tracking-wider`}>
                      Most popular
                    </span>
                  )}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{plan.slug}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-5">{plan.desc}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground tracking-tight">${plan.price}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className={`h-4 w-4 ${accentCheck} shrink-0 mt-0.5`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.slug}`}>
                    <Button className={`w-full h-10 font-semibold ${
                      plan.hot
                        ? accentBtn
                        : "bg-foreground hover:bg-foreground/90 text-background"
                    }`}>
                      {plan.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </MotionCard>
              );
            })}
          </Stagger>

          {/* Add-ons */}
          <FadeUp className="mt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-3">add_ons · stack_on_any_plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {addOns.map((a) => (
                <div key={a.name} className="rounded-xl border border-border/60 bg-card/30 p-4">
                  <p className="font-semibold text-foreground text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
                  <p className="font-mono text-[11px] text-cyan-500 dark:text-cyan-400 mt-3">{a.price}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Positioning + Comparison ── */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-radial from-cyan-500/10 via-cyan-500/[0.02] to-transparent blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <FadeUp>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-cyan-500 dark:text-cyan-400">
              positioning
            </p>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.06] max-w-3xl mx-auto">
              Replace a <span className="text-cyan-500 dark:text-cyan-400">$3,000/month accountant</span> with a 24/7 AI system.
            </h2>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Never sleeps. Never misses transactions. Updates your finances in real time.
            </p>
          </FadeUp>

          {/* Traditional vs AI comparison */}
          <FadeUp className="mt-14 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 rounded-2xl border border-border/60 overflow-hidden">
              <div className="bg-card/40 p-5 border-r border-border/60 text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-rose-500">traditional_bookkeeping</p>
              </div>
              <div className="bg-cyan-500/[0.04] p-5 text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-500 dark:text-cyan-400">ai_accountant</p>
              </div>
              {comparison.map((row, i) => (
                <Fragment key={i}>
                  <div className={`p-5 border-r border-t border-border/60 text-left text-sm text-muted-foreground ${i % 2 === 0 ? "bg-card/20" : "bg-card/40"}`}>
                    × {row.trad}
                  </div>
                  <div className={`p-5 border-t border-border/60 text-left text-sm text-foreground ${i % 2 === 0 ? "bg-cyan-500/[0.02]" : "bg-cyan-500/[0.05]"}`}>
                    <span className="text-cyan-500 dark:text-cyan-400 font-semibold">✓</span> {row.ai}
                  </div>
                </Fragment>
              ))}
            </div>
          </FadeUp>

          {/* Conversion hook */}
          <FadeUp className="mt-14">
            <div className="inline-block rounded-2xl border border-cyan-500/40 bg-cyan-500/[0.06] px-6 py-4">
              <p className="text-sm text-muted-foreground font-mono">try_it</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
                Upload 5 invoices <span className="text-cyan-500 dark:text-cyan-400">→</span> get a full financial report instantly.
              </p>
            </div>
          </FadeUp>

          <FadeUp className="mt-10">
            <p className="text-xs text-muted-foreground italic max-w-xl mx-auto">
              We&apos;re not selling bookkeeping. We&apos;re selling an autonomous financial intelligence system that replaces humans.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-radial from-emerald-500/10 via-emerald-500/[0.02] to-transparent blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-6 py-28 text-center">
          <FadeUp>
            <MonoLabel>JOIN 500+ BUSINESSES</MonoLabel>
            <h2 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.02em] leading-[1.04]">
              Stop buying<br />accounting software.<br />
              <span className="text-emerald-400">Start getting it done.</span>
            </h2>
            <p className="mt-7 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Total spend on accounting services is many times larger than spend on accounting software.
              We&apos;re replacing the service — not just improving the tool.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register?plan=starter">
                <Button size="lg" className="h-12 px-7 text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-black gap-1.5">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="h-12 px-7 text-base font-medium border-border hover:border-foreground/40">
                  See pricing
                </Button>
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              first_month_free · no_credit_card · cancel_anytime
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center">
              <span className="text-background font-black text-[9px]">L</span>
            </div>
            <span className="font-semibold text-foreground">ledgr</span>
            <span className="text-xs text-muted-foreground">· AI-native accounting firm</span>
          </div>
          <p className="font-mono text-xs">© 2026 ledgr — we do your accounting.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
            {[["Pricing","#pricing"],["Privacy","/privacy"],["Terms","/terms"],["Refunds","/refunds"],["Contact","/contact"]].map(([l,href])=>(
              <Link key={l} href={href} className="hover:text-foreground transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── terminal line subcomponent ── */
function TerminalLine({
  prompt = false,
  output = false,
  user,
  cmd,
  text,
  color = "text-foreground/80",
  delay = 0,
}: {
  prompt?: boolean;
  output?: boolean;
  user?: string;
  cmd?: string;
  text?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay }}
      className="flex items-start gap-2"
    >
      {prompt && (
        <>
          <span className="text-emerald-400 shrink-0">{user}</span>
          <span className="text-muted-foreground shrink-0">$</span>
          <span className="text-foreground/90">{cmd}</span>
        </>
      )}
      {output && <span className={`${color} pl-0`}>{text}</span>}
    </motion.div>
  );
}
