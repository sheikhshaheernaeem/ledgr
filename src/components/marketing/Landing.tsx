"use client";

import Link from "next/link";
import { useScroll, useSpring, useTransform, useMotionValue, useInView, motion } from "framer-motion";
import { Fragment, useRef, useState, useEffect } from "react";
import {
  ArrowRight, Check, TrendingUp, TrendingDown, Shield,
  BarChart3, FileText, Zap, Brain, Star, Sparkles, Activity,
} from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { useMode } from "@/components/providers/ModeProvider";
import { Reveal, Aurora, Pill } from "./primitives";

/* ── scroll progress bar ── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-emerald-500"
    />
  );
}

/* ── film grain overlay ── */
function Grain() {
  const svg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] opacity-[0.035] mix-blend-overlay dark:opacity-[0.05]"
      style={{ backgroundImage: `url("${svg}")`, backgroundSize: "140px 140px" }}
    />
  );
}

/* ── 3D cursor-tilt wrapper ── */
function Tilt({ children, className = "", max = 8 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 150, damping: 18 });
  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── count-up number (animates on scroll into view) ── */
function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const m = value.match(/^([^\d]*)([\d.,]+)([\s\S]*)$/);
  const prefix = m?.[1] ?? "";
  const numStr = m?.[2] ?? value;
  const suffix = m?.[3] ?? "";
  const target = parseFloat(numStr.replace(/,/g, "")) || 0;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  const shown = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span ref={ref} className={className}>{prefix}{shown}{suffix}</span>;
}

/* ── cursor-tracking spotlight card ── */
function Spotlight({ children, className = "", glow = "16 185 129" }: { children: React.ReactNode; className?: string; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -400, y: -400 });
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(340px circle at ${pos.x}px ${pos.y}px, rgb(${glow} / 0.14), transparent 65%)` }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/* ── data ── */
const services = [
  { icon: Brain,      title: "AI Financial Intelligence", desc: "Ask Ledgr AI anything. Get real answers backed by your live data, not generic chatbot advice — it reads your books, forecasts runway, and flags anomalies in real time." },
  { icon: Zap,        title: "Monthly Bookkeeping",       desc: "We categorize every transaction, reconcile your accounts, and deliver clean books by the 5th of every month." },
  { icon: FileText,   title: "P&L + Financial Reports",   desc: "Profit & loss, balance sheet, and cash flow — prepared, reviewed, and delivered without you lifting a finger." },
  { icon: TrendingUp, title: "Tax Preparation",           desc: "Books organized year-round so tax season isn't a crisis. We handle prep, you review and approve." },
  { icon: Shield,     title: "Human Expert Review",       desc: "Every report reviewed by a real accountant before it reaches you. AI lifts heavy. Humans ensure accuracy." },
  { icon: BarChart3,  title: "Cash Flow Forecasting",     desc: "We model your runway, flag issues early, and surface insights so you make decisions with data." },
];

const pricingBookkeeping = [
  { name: "Basic", price: 299, desc: "Very small businesses · low volume", slug: "starter",
    features: ["Up to 100 transactions/month", "Manual bookkeeping by human", "Monthly financial reports", "Basic expense categorization", "3–7 day turnaround"],
    cta: "Start free", hot: false },
  { name: "Pro", price: 599, desc: "Small businesses scaling operations", slug: "growth",
    features: ["Up to 500 transactions/month", "Manual bookkeeping", "Weekly updates", "Categorized expense tracking", "Improved accuracy checks", "1–3 day turnaround"],
    cta: "Start free", hot: true },
  { name: "Advanced", price: 1499, desc: "Businesses needing human oversight", slug: "cfo",
    features: ["High transaction volume support", "Dedicated bookkeeper", "Real-time transaction updates", "Tax-ready financial reports", "Custom reporting support", "Same-day / near real-time updates"],
    cta: "Talk to us", hot: false },
];

const pricingAiAccountant = [
  { name: "Starter AI", price: 999, desc: "Freelancers & small businesses starting automation", slug: "ai-starter",
    features: ["Up to 200 documents/month", "AI-powered automatic bookkeeping (no manual entry)", "Smart transaction categorization (auto-learns)", "Real-time financial dashboard", "Basic P&L reports", "~80% autonomous", "Standard queue · 30–90 sec / document"],
    cta: "Start free", hot: false },
  { name: "Growth AI", price: 1999, desc: "Scaling startups & growing businesses", slug: "ai-growth",
    features: ["Up to 1,000 documents/month", "Multi-source ingestion (uploads, email, integrations)", "Full end-to-end AI accounting pipeline", "Real-time P&L + cash flow tracking", "AI anomaly + duplicate detection", "Multi-user access + role permissions", "~95% autonomous · Priority queue"],
    cta: "Start free", hot: true },
  { name: "Autonomous AI", price: 2999, desc: "Flagship — replaces human accounting workflows", slug: "ai-cfo",
    features: ["Unlimited documents + transactions", "100% autonomous · zero manual work", "Auto-reconciliation (bank ↔ transactions)", "Predictive forecasting + trend analysis", "Real-time P&L, balance sheet, cash flow", "Self-healing data validation", "Tax-ready summaries · Fraud detection", "Instant processing (<10s) · Priority SLA", "Dedicated onboarding"],
    cta: "Talk to us", hot: false },
];

const addOns = [
  { name: "Integrations", desc: "Bank sync · Stripe / PayPal · ERP connectors", price: "from $99/mo" },
  { name: "Advanced Reports Pack", desc: "Balance Sheet · Cash Flow Forecast · Custom KPI dashboards", price: "from $149/mo" },
  { name: "Dedicated Support", desc: "Account manager · Priority SLA · 1-hour response", price: "from $199/mo" },
];

const stats = [
  { val: "500+", label: "Businesses served" },
  { val: "$50M+", label: "Transactions processed" },
  { val: "99.9%", label: "On-time delivery" },
  { val: "70%", label: "Avg. cost savings" },
];

const marquee = ["Stripe", "PayPal", "Shopify", "QuickBooks", "Plaid", "Xero", "AWS", "Mercury", "Ramp", "Brex", "Gusto", "Wise"];

const testimonials = [
  { q: "Switched from Bench after they shut down. Ledgr onboarded us in 2 hours and had our first P&L by the 5th. Absolutely seamless.", name: "Sarah K.", role: "Founder, e-commerce", initials: "SK" },
  { q: "Finally stopped doing my own bookkeeping. The AI catches things my old accountant missed, and it costs 3x less. Genuinely impressed.", name: "Marcus T.", role: "Freelance consultant", initials: "MT" },
  { q: "The AI assistant is the real deal. Asked about my Q2 margins and got a detailed breakdown in seconds, with actual numbers from my books.", name: "Priya L.", role: "SaaS founder", initials: "PL" },
];

const comparison = [
  { trad: "Manual work", ai: "Fully automated" },
  { trad: "Delayed reports", ai: "Real-time data" },
  { trad: "Human errors", ai: "AI validation" },
  { trad: "Expensive scaling", ai: "Infinite scalability" },
  { trad: "$3,000+/mo per accountant", ai: "24/7 — never sleeps" },
];

// Mode-specific copy — same layout, honest framing per product.
const COPY = {
  ai: {
    heroLine1: "Your books,",
    heroLine2: "run by AI.",
    heroSub: "Ledgr's AI reads every transaction, categorizes it, and closes your books — instantly. Reviewed by expert accountants when it matters. Not software you use. An accountant that never sleeps.",
    servicesIntro: "Not features in software. An AI accountant working for you, 24/7.",
    howIntro: "Three steps. Then just watch it work.",
    aiEyebrow: "AI intelligence",
    comparisonHeadline: "$3,000/month accountant",
    finalCtaHeadline: "Start getting it done.",
    finalCtaSub: "We're replacing the accountant — not just improving the tool. Books closed and reports delivered, automatically, every month.",
  },
  bookkeeping: {
    heroLine1: "Your accounting,",
    heroLine2: "done for you.",
    heroSub: "Ledgr handles your books, reports, and tax prep end-to-end — a dedicated bookkeeper reviews every transaction by hand. Not software you use. A service you receive.",
    servicesIntro: "Not features in software. Real accounting work, done by a human — so you never have to.",
    howIntro: "Three steps. Then just wait for your books.",
    aiEyebrow: "Backed by AI",
    comparisonHeadline: "$3,000/month in-house hire",
    finalCtaHeadline: "Stop buying accounting software.",
    finalCtaSub: "We're replacing the service — not just improving the tool. Books, reports and tax, delivered on time, every month.",
  },
} as const;

export default function Landing() {
  const { mode } = useMode();
  const isAi = mode === "ai";
  const copy = COPY[mode];
  const pricing = isAi ? pricingAiAccountant : pricingBookkeeping;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-emerald-500/25">
      <ScrollProgress />
      <Grain />

      <PublicNav />

      {/* ── Hero ── */}
      <section className="relative">
        <Aurora />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* copy */}
            <div>
              <Reveal><Pill>{isAi ? "AI-native accounting firm" : "Human-reviewed bookkeeping"}</Pill></Reveal>
              <h1 className="mt-6 text-[3.25rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-[5rem]">
                {[
                  { t: copy.heroLine1, c: "text-gradient-ink", d: 0.08 },
                  { t: copy.heroLine2, c: "text-gradient-brand", d: 0.2 },
                ].map((line) => (
                  <span key={line.t} className="block overflow-hidden py-[0.06em]">
                    <motion.span
                      initial={{ y: "115%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.85, delay: line.d, ease: [0.22, 1, 0.36, 1] }}
                      className={`block ${line.c}`}
                    >
                      {line.t}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <Reveal delay={0.12}>
                <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  {copy.heroSub}
                </p>
              </Reveal>
              <Reveal delay={0.18}>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/${mode}/register?plan=${isAi ? "ai-starter" : "starter"}`}
                    className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold text-black shadow-xl transition-all hover:-translate-y-0.5 ${isAi ? "bg-cyan-500 shadow-cyan-500/25 hover:bg-cyan-400 hover:shadow-cyan-500/45" : "bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/45"}`}
                  >
                    Start free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="#how"
                    className="glass inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-medium text-foreground transition-all hover:-translate-y-0.5"
                  >
                    See how it works
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["First month free", "No credit card", "Setup in 30 min"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-500" />{t}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* glass product mockup */}
            <Reveal delay={0.15} y={30}>
              <div className="relative animate-float">
                <div className={`absolute -inset-6 -z-10 rounded-[2rem] blur-2xl ${isAi ? "bg-cyan-500/15" : "bg-emerald-500/15"}`} />
                <Tilt className="glass-strong rounded-[1.75rem] p-5 shadow-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Acme Inc</p>
                      <p className="text-xs text-muted-foreground">March 2026 · overview</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                    <p className="text-xs text-muted-foreground">Net profit</p>
                    <p className="mt-1 text-4xl font-bold tracking-tight text-gradient-brand">$15,460</p>
                    <div className="mt-4 flex items-end gap-1.5">
                      {[38, 52, 44, 61, 49, 72, 58, 83, 67, 91, 78, 100].map((h, i) => (
                        <div key={i} className={`flex-1 rounded-sm ${isAi ? "bg-cyan-500/70" : "bg-emerald-500/70"}`} style={{ height: `${h * 0.7}px` }} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { l: "Revenue", v: "$24,800", i: TrendingUp, c: "text-emerald-500" },
                      { l: "Expenses", v: "$9,340", i: TrendingDown, c: "text-rose-500" },
                      { l: "Runway", v: "14 mo", i: Activity, c: "text-cyan-500" },
                    ].map((m) => (
                      <div key={m.l} className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <m.i className={`h-4 w-4 ${m.c}`} />
                        <p className="mt-2 text-[15px] font-semibold tracking-tight tabular-nums">{m.v}</p>
                        <p className="text-[10px] text-muted-foreground">{m.l}</p>
                      </div>
                    ))}
                  </div>
                </Tilt>

                {/* floating chips */}
                <div className="glass absolute -left-5 top-14 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium shadow-lg animate-float-slow sm:flex">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Books closed by the 5th
                </div>
                <div className="glass absolute -right-4 bottom-16 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium shadow-lg animate-float sm:flex">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> 247 txns categorized
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Logo marquee ── */}
      <section className="border-y border-border/60 bg-card/30 py-8">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Connects with the tools you already use
        </p>
        <div className="mask-fade-x relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-12">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i} className="whitespace-nowrap text-xl font-semibold text-muted-foreground/50">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bento features ── */}
      <section id="services" className="relative py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-500">What we do</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
              Services we <span className="text-gradient-brand">perform for you.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {copy.servicesIntro}
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr">
            {services.map((s, i) => {
              const big = i === 0;
              return (
                <Reveal key={s.title} delay={i * 0.05} className={`h-full ${big ? "sm:col-span-2 lg:row-span-2" : ""}`}>
                  <Spotlight className="h-full rounded-3xl border border-border/60 bg-card/50 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10">
                    <div className="flex h-full flex-col">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/70 transition-all duration-300 group-hover:scale-110 group-hover:border-emerald-500/40">
                          <s.icon className="h-5 w-5 text-emerald-500" />
                        </div>
                        {big && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-500">
                            Featured
                          </span>
                        )}
                      </div>
                      <h3 className={`mt-5 font-semibold tracking-tight ${big ? "text-2xl" : "text-lg"}`}>{s.title}</h3>
                      <p className={`mt-2 leading-relaxed text-muted-foreground ${big ? "max-w-md text-[15px]" : "text-sm"}`}>{s.desc}</p>
                      {big && (
                        <div className="mt-6 flex-1 rounded-2xl border border-border/60 bg-background/40 p-4">
                          <div className="flex justify-end">
                            <div className="rounded-2xl rounded-br-sm bg-cyan-500/10 px-3 py-2 text-xs">
                              What&apos;s my burn this quarter?
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-500">
                              <Sparkles className="h-3 w-3 text-black" />
                            </div>
                            <div className="rounded-2xl rounded-bl-sm border border-border/60 bg-card/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                              Your Q2 burn is <span className="font-semibold text-foreground">$28,020/mo</span>, down 12% vs Q1. Runway <span className="font-semibold text-emerald-500">~14 months</span>. ✓
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Spotlight>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative border-t border-border/60 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-500">Process</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl text-gradient-brand">
              {copy.howIntro}
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { n: "01", icon: FileText, title: "Share your data", desc: "Upload a CSV or connect your bank. 30 minutes. No accountant meetings." },
              { n: "02", icon: Brain, title: "We do the work", desc: "AI categorizes and analyses every transaction. Accountants review and finalise." },
              { n: "03", icon: Check, title: "Get clean financials", desc: "P&L, balance sheet, cash flow delivered by the 5th — reviewed and tax-ready." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="group relative h-full rounded-3xl border border-border/60 bg-card/50 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/70 transition-transform duration-300 group-hover:scale-110">
                      <s.icon className="h-5 w-5 text-cyan-500" />
                    </div>
                    <span className="text-4xl font-bold tracking-tight text-muted-foreground/20">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI section ── */}
      <section className="relative border-t border-border/60 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-500">{copy.aiEyebrow}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
                AI that actually <span className="text-gradient-brand">knows your numbers.</span>
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Ledgr AI runs on Llama 3.3 70B — built into your account at no extra cost.
                Ask it anything with live access to your actual financial data.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["What's my runway at current burn?", "Which expenses are tax deductible?", "Do I have overdue invoices?", "Summarise my Q2 performance"].map((q) => (
                  <span key={q} className="cursor-default rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 text-sm text-muted-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-foreground">
                    {q}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.12} y={28}>
              <div className="glass-strong overflow-hidden rounded-3xl shadow-2xl">
                <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500">
                    <Sparkles className="h-3.5 w-3.5 text-black" />
                  </div>
                  <p className="flex-1 text-sm font-semibold">Ledgr AI</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> live
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-cyan-500/10 px-4 py-2.5 text-sm">
                      What&apos;s my runway at current burn?
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500">
                      <Sparkles className="h-3.5 w-3.5 text-black" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border/60 bg-background/60 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
                      Based on your <span className="font-semibold text-foreground">$15,460</span> net profit this month and current cash of <span className="font-semibold text-foreground">$84,200</span>, your runway is <span className="font-semibold text-emerald-500">~14 months</span> at current burn. No overdue invoices. ✓
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 p-4">
                  <div className="rounded-full border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/60">
                    Ask anything about your finances…
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="relative overflow-hidden border-y border-border/60 py-16">
        <Aurora />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <CountUp value={s.val} className="block text-4xl font-bold tracking-tight sm:text-5xl text-gradient-brand" />
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-500">Loved by founders</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">What clients say.</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.06} className="h-full">
                <Spotlight glow="6 182 212" className="h-full rounded-3xl border border-border/60 bg-card/50 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10">
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="mb-6 text-[15px] leading-relaxed text-foreground/90">&ldquo;{t.q}&rdquo;</p>
                  <div className="flex items-center gap-3 border-t border-border/40 pt-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none">{t.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative border-t border-border/60 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-500">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
              {isAi ? "AI Accountant" : "Book keeping"} <span className="text-gradient-brand">plans.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">Pick the tier that fits. Upgrade anytime.</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {pricing.map((plan, i) => (
              <Reveal key={plan.slug} delay={i * 0.06}>
                <div className={`relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 ${plan.hot ? `border-2 shadow-2xl bg-card/50 backdrop-blur ${isAi ? "border-cyan-500/50 shadow-cyan-500/10" : "border-emerald-500/50 shadow-emerald-500/10"}` : "border border-border/60 bg-card/50 backdrop-blur hover:border-border"}`}>
                  {plan.hot && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black ${isAi ? "bg-cyan-500" : "bg-emerald-500"}`}>
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <ul className="mt-6 mb-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/${mode}/register?plan=${plan.slug}`}
                    className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 ${plan.hot ? `text-black shadow-lg ${isAi ? "bg-cyan-500 shadow-cyan-500/25 hover:bg-cyan-400" : "bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-400"}` : "border border-border bg-foreground text-background hover:opacity-90"}`}
                  >
                    {plan.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          {/* add-ons */}
          <Reveal className="mt-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Add-ons · stack on any plan</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {addOns.map((a) => (
                <div key={a.name} className="group rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10">
                  <p className="text-sm font-semibold transition-colors group-hover:text-emerald-500">{a.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
                  <p className="mt-3 text-[11px] font-medium text-cyan-500">{a.price}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="border-t border-border/60 py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
              Replace a <span className="text-gradient-brand">{copy.comparisonHeadline}</span> with {isAi ? "a 24/7 AI system" : "a done-for-you team"}.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">Never sleeps. Never misses transactions. Updates in real time.</p>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-2xl">
            <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-border/60">
              <div className="border-r border-border/60 bg-card/40 p-4 text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-rose-500">Traditional</p>
              </div>
              <div className="bg-emerald-500/[0.05] p-4 text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-500">{isAi ? "AI accountant" : "Ledgr bookkeeping"}</p>
              </div>
              {comparison.map((row, i) => (
                <Fragment key={i}>
                  <div className={`border-t border-r border-border/60 p-4 text-left text-sm text-muted-foreground transition-colors hover:bg-rose-500/[0.05] ${i % 2 ? "bg-card/40" : "bg-card/20"}`}>
                    ✗ {row.trad}
                  </div>
                  <div className={`group border-t border-border/60 p-4 text-left text-sm transition-colors hover:bg-emerald-500/[0.12] ${i % 2 ? "bg-emerald-500/[0.05]" : "bg-emerald-500/[0.02]"}`}>
                    <span className="inline-block font-semibold text-emerald-500 transition-transform group-hover:scale-125">✓</span> {row.ai}
                  </div>
                </Fragment>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden py-32">
        <Aurora />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <Pill>Join 500+ businesses</Pill>
            <h2 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              {isAi ? "Stop doing your own books." : "Stop buying accounting software."}
              <br />
              <span className="text-gradient-brand">{copy.finalCtaHeadline}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {copy.finalCtaSub}
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/${mode}/register?plan=${isAi ? "ai-starter" : "starter"}`}
                className={`group inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-black shadow-xl transition-all hover:-translate-y-0.5 ${isAi ? "bg-cyan-500 shadow-cyan-500/30 hover:bg-cyan-400 hover:shadow-cyan-500/50" : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-emerald-500/50"}`}
              >
                Get started free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#pricing" className="glass inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-medium transition-all hover:-translate-y-0.5">
                See pricing
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">first_month_free · no_credit_card · cancel_anytime</p>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
              <span className="text-[9px] font-black text-background">L</span>
            </div>
            <span className="font-semibold text-foreground">ledgr</span>
            <span className="text-xs">· {isAi ? "AI-native accounting firm" : "human-reviewed bookkeeping"}</span>
          </div>
          <p className="font-mono text-xs">© 2026 ledgr — we do your accounting.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
            {[["Pricing", "#pricing"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Refunds", "/refunds"], ["Contact", "/contact"]].map(([l, href]) => (
              <Link key={l} href={href} className="transition-colors hover:text-foreground">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
