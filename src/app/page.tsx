"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight, CheckCircle2, TrendingUp, Shield, Clock,
  BarChart3, FileText, Zap, Brain, Users, Sparkles, Star, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};
const stagger = (d = 0.08) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

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

function Stagger({ children, className = "", delay = 0.09 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} variants={stagger(delay)} initial="hidden"
      animate={inView ? "show" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.18 } }} className={className}>
      {children}
    </motion.div>
  );
}

/* glow card: gradient border effect */
function GlowCard({ children, className = "", glow = "emerald" }: { children: React.ReactNode; className?: string; glow?: string }) {
  const glowMap: Record<string, string> = {
    emerald: "from-emerald-500/40 to-teal-500/20",
    blue: "from-blue-500/40 to-indigo-500/20",
    violet: "from-violet-500/40 to-purple-500/20",
  };
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.18 } }} className="relative group">
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${glowMap[glow] ?? glowMap.emerald} opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500`} />
      <div className={`relative rounded-2xl ${className}`}>{children}</div>
    </motion.div>
  );
}

/* ── data ── */
const services = [
  { icon: Zap,       title: "Monthly Bookkeeping",       desc: "We categorize every transaction, reconcile your accounts, and deliver clean books by the 5th of every month.", from: "from-emerald-500/20", to: "to-teal-500/10",   ic: "text-emerald-400", glow: "emerald" },
  { icon: FileText,  title: "P&L + Financial Reports",   desc: "Profit & loss, balance sheet, and cash flow — prepared, reviewed, and delivered without you lifting a finger.", from: "from-blue-500/20",   to: "to-indigo-500/10", ic: "text-blue-400",    glow: "blue" },
  { icon: Brain,     title: "AI Financial Intelligence", desc: "Ask Ledgr AI anything. Get real answers backed by your live data, not generic chatbot advice.", from: "from-violet-500/20", to: "to-purple-500/10", ic: "text-violet-400",  glow: "violet" },
  { icon: TrendingUp,title: "Tax Preparation",           desc: "Books organized year-round so tax season isn't a crisis. We handle prep, you review and approve.", from: "from-orange-500/20", to: "to-amber-500/10",  ic: "text-orange-400",  glow: "emerald" },
  { icon: Shield,    title: "Human Expert Review",       desc: "Every report reviewed by a real accountant before it reaches you. AI lifts heavy. Humans ensure accuracy.", from: "from-rose-500/20",   to: "to-pink-500/10",   ic: "text-rose-400",    glow: "blue" },
  { icon: BarChart3, title: "Cash Flow Forecasting",     desc: "We model your runway, flag issues early, and surface insights so you make decisions with data.", from: "from-cyan-500/20",   to: "to-sky-500/10",    ic: "text-cyan-400",    glow: "violet" },
];

const pricing = [
  { name: "Starter", price: 299, desc: "Freelancers & solopreneurs", slug: "starter",
    features: ["Up to 200 transactions/month", "Monthly P&L to inbox", "AI categorization + human review", "Ledgr AI financial assistant", "Email support"],
    cta: "Start Free — First Month on Us", hot: false },
  { name: "Growth",  price: 599, desc: "Small businesses $10K–$100K/mo", slug: "growth",
    features: ["Up to 500 transactions/month", "Monthly P&L + quarterly deep-dive", "Tax prep included", "Cash flow forecasting", "Priority 24h support"],
    cta: "Start Free — First Month on Us", hot: true },
  { name: "CFO",     price: 1499, desc: "Growing companies that need more", slug: "cfo",
    features: ["Unlimited transactions", "Dedicated human accountant", "Weekly check-ins", "Board-ready financials", "Full fractional CFO service"],
    cta: "Talk to Us", hot: false },
];

const evolution = [
  { era: "Traditional", label: "Outsourced Service", desc: "Hired a bookkeeper. Expensive, slow, opaque.", dim: true },
  { era: "2010s",       label: "SaaS Software",      desc: "QuickBooks, Xero. Better tools — you still do the work.", dim: true },
  { era: "2023–2025",   label: "AI Copilot",         desc: "AI-assisted tools. Still software. Still your job.", dim: true },
  { era: "Now",         label: "AI-Native Service",  desc: "We do the work. You get the output. This is Ledgr.", dim: false },
];

const stats = [
  { val: "500+", label: "Businesses served" },
  { val: "$50M+", label: "Transactions processed" },
  { val: "99.9%", label: "On-time delivery" },
  { val: "70%", label: "Avg. cost savings" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-emerald-500/20">

      {/* ── Navbar ── */}
      <motion.nav initial={{ y: -64, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <span className="text-black font-black text-sm leading-none">L</span>
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Ledgr</span>
            <span className="hidden sm:inline-flex text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">AI-native</span>
          </div>
          {/* links */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {[["#services","Services"],["#how-it-works","How it works"],["#pricing","Pricing"]].map(([href,label])=>(
              <Link key={href} href={href} className="hover:text-foreground transition-colors duration-200">{label}</Link>
            ))}
          </nav>
          {/* actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">Log in</Button></Link>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="relative bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm shadow-lg shadow-emerald-500/30 overflow-hidden group">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-8 text-center overflow-hidden">
        {/* ambient orbs */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-emerald-500/12 via-emerald-500/4 to-transparent rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -40, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-20 right-[-100px] w-[500px] h-[500px] bg-gradient-radial from-blue-500/8 via-transparent to-transparent rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, 25, 0], y: [0, 15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute top-32 left-[-80px] w-[400px] h-[400px] bg-gradient-radial from-violet-500/6 via-transparent to-transparent rounded-full blur-3xl" />
          {/* grid */}
          <div className="absolute inset-0 opacity-[0.018] dark:opacity-[0.035]"
            style={{ backgroundImage: "linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        {/* falling lines — outside -z-10 stack, in front of background, behind text */}
        <style>{`@keyframes ledgrFall{0%{transform:translateY(-50px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(1100px);opacity:0}}`}</style>
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {[
            { left: "6%",  delay: 0,   dur: 4.2, h: 200, rgba: "52,211,153" },
            { left: "17%", delay: 1.1, dur: 3.7, h: 260, rgba: "96,165,250" },
            { left: "29%", delay: 0.4, dur: 5.0, h: 170, rgba: "110,231,183" },
            { left: "42%", delay: 2.3, dur: 3.9, h: 220, rgba: "45,212,191" },
            { left: "58%", delay: 0.8, dur: 4.6, h: 180, rgba: "167,139,250" },
            { left: "71%", delay: 1.7, dur: 3.5, h: 240, rgba: "52,211,153" },
            { left: "84%", delay: 3.1, dur: 4.8, h: 150, rgba: "147,197,253" },
            { left: "94%", delay: 2.0, dur: 4.4, h: 190, rgba: "52,211,153" },
          ].map((l, i) => (
            <div key={i} style={{
              position: "absolute",
              left: l.left,
              top: 0,
              width: 6,
              height: l.h,
              borderRadius: "9999px",
              background: `linear-gradient(to bottom, rgba(${l.rgba},1), rgba(${l.rgba},0.4) 50%, transparent)`,
              boxShadow: `0 0 12px 2px rgba(${l.rgba},0.6)`,
              animation: `ledgrFall ${l.dur}s linear ${l.delay}s infinite`,
            }} />
          ))}
        </div>

        {/* badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-7 inline-flex">
          <div className="relative inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <motion.span animate={{ scale: [1, 1.6, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            We don&apos;t sell software — we do the accounting
          </div>
        </motion.div>

        {/* headline */}
        <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
          className="text-5xl sm:text-[5.5rem] lg:text-[6.5rem] font-black tracking-[-0.03em] leading-[0.98] mb-7">
          <span className="text-foreground">Your accounting,</span>
          <br />
          <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            done for you.
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.34 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Ledgr is an AI-native accounting firm. We handle your books, reports, and tax prep
          end-to-end — reviewed by expert accountants.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.46 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/register?plan=starter">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="relative h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base shadow-2xl shadow-emerald-500/40 overflow-hidden group border-0">
                <span className="relative z-10 flex items-center gap-2">Get Started Free <ArrowRight className="h-4 w-4" /></span>
                <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
              </Button>
            </motion.div>
          </Link>
          <Link href="#pricing">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-border/50 hover:border-border bg-card/40 backdrop-blur-sm">
                See Pricing
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground mb-16">
          {["First month free", "No credit card", "Setup in 30 min"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{t}
            </span>
          ))}
        </motion.div>

        {/* Scroll down indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          className="flex flex-col items-center gap-2 mb-12">
          <span className="text-[11px] font-medium text-muted-foreground/50 tracking-widest uppercase">Scroll</span>
          <div className="relative w-5 h-8 rounded-full border border-border/40 flex items-start justify-center pt-1.5">
            <motion.div animate={{ y: [0, 10, 0], opacity: [1, 0, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 rounded-full bg-emerald-400" />
          </div>
        </motion.div>

        {/* Hero visual — dashboard mockup */}
        <motion.div initial={{ opacity: 0, y: 56, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }} className="relative mx-auto max-w-4xl">
          {/* glow under card */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 via-blue-500/8 to-violet-500/10 rounded-3xl blur-2xl" />
          {/* gradient border */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-emerald-500/30 via-border/30 to-blue-500/20" />
          <div className="relative rounded-2xl bg-card/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60 bg-muted/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex-1 mx-6 bg-background/60 border border-border/40 rounded-lg h-6 flex items-center px-3 text-[11px] text-muted-foreground/70 gap-2">
                <div className="w-3 h-3 rounded-full border border-border/60" />
                app.ledgr.ai/dashboard
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </div>
            </div>
            {/* dashboard body */}
            <div className="p-5 grid grid-cols-12 gap-4">
              {/* sidebar */}
              <div className="col-span-2 hidden sm:flex flex-col gap-1.5">
                {["Dashboard", "Transactions", "Invoices", "Reports", "Tax", "AI Chat"].map((item, i) => (
                  <div key={item} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${i === 0 ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400" : "text-muted-foreground/60"}`}>
                    {item}
                  </div>
                ))}
              </div>
              {/* main */}
              <div className="col-span-12 sm:col-span-10 space-y-4">
                {/* metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue MTD", val: "$24,800", delta: "+12.4%", up: true },
                    { label: "Expenses MTD", val: "$9,340", delta: "-3.1%", up: false },
                    { label: "Net Profit",   val: "$15,460", delta: "+22.1%", up: true },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-border/50 bg-background/60 p-3.5">
                      <p className="text-[10px] text-muted-foreground mb-1.5">{m.label}</p>
                      <p className="text-lg font-bold text-foreground leading-none mb-1.5">{m.val}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${m.up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{m.delta}</span>
                    </div>
                  ))}
                </div>
                {/* chart */}
                <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-foreground">Revenue vs Expenses</p>
                    <span className="text-[10px] text-muted-foreground">Last 6 months</span>
                  </div>
                  <div className="flex items-end gap-3 h-20">
                    {[[65,40],[70,45],[50,38],[82,42],[67,35],[91,44]].map(([rev,exp],i)=>(
                      <div key={i} className="flex-1 flex items-end gap-0.5">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${rev}%` }}
                          transition={{ duration: 0.6, delay: 0.8+i*0.07, ease: "easeOut" }}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600/80 to-emerald-400/60" />
                        <motion.div initial={{ height: 0 }} animate={{ height: `${exp}%` }}
                          transition={{ duration: 0.6, delay: 0.85+i*0.07, ease: "easeOut" }}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-rose-600/50 to-rose-400/30" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-emerald-400/80" />Revenue</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-rose-400/60" />Expenses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="relative rounded-2xl border border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/3 via-transparent to-blue-500/3" />
          <div className="relative grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/40">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 text-center">
                <p className="text-4xl font-black bg-gradient-to-br from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-1.5">{s.val}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted by strip ── */}
      <FadeUp className="border-y border-border/40 py-5 bg-card/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="text-xs text-muted-foreground/50 uppercase tracking-widest font-medium mr-2">Trusted by founders at</span>
          {["Y Combinator alumni", "500 Startups grads", "Indie hackers", "Series A companies", "Solo consultants"].map((name) => (
            <span key={name} className="px-3 py-1 rounded-full border border-border/50 bg-card/60 text-xs text-muted-foreground/70">{name}</span>
          ))}
        </div>
      </FadeUp>

      {/* ── Evolution ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">Why Ledgr</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-5">The next step after AI copilots</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Four generations of accounting. Ledgr is the last: we do the work, you get the result.
          </p>
        </FadeUp>
        <Stagger className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {evolution.map((e, i) => (
            <Card key={e.era}>
              <div className="relative h-full">
                {i < 3 && <ChevronRight className="absolute -right-2 top-6 h-4 w-4 text-border/50 hidden sm:block z-10" />}
                <div className={`h-full rounded-2xl border p-5 flex flex-col gap-2.5 transition-all duration-300 ${
                  e.dim
                    ? "border-border/50 bg-card/40 opacity-75"
                    : "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/5 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                }`}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${e.dim ? "text-muted-foreground/80" : "text-emerald-500 dark:text-emerald-400"}`}>{e.era}</span>
                  <p className={`font-bold text-sm ${e.dim ? "text-foreground/80" : "text-foreground"}`}>{e.label}</p>
                  <p className={`text-xs leading-relaxed ${e.dim ? "text-muted-foreground/70" : "text-muted-foreground"}`}>{e.desc}</p>
                  {!e.dim && (
                    <div className="mt-auto pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        <motion.span animate={{ scale: [1,1.5,1] }} transition={{ duration: 1.8, repeat: Infinity }}
                          className="w-1 h-1 rounded-full bg-emerald-400" />
                        You are here
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </Stagger>
      </section>

      {/* ── Services ── */}
      <section id="services" className="relative border-y border-border/40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-card/50 via-card/20 to-card/50" />
        <div className="absolute inset-0 -z-10 opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="text-center mb-14">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">What we do</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-5">Services we perform for you</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Not features in software. Services we perform — so you never have to.
            </p>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <GlowCard key={s.title} glow={s.glow}>
                <div className="h-full bg-card border border-border/60 rounded-2xl p-6 hover:border-border transition-all duration-300 hover:shadow-lg group">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon className={`h-5 w-5 ${s.ic}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2.5 text-[15px]">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </GlowCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-16">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">Process</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-5">How it works</h2>
          <p className="text-muted-foreground text-lg">Three steps. Then just wait for your books.</p>
        </FadeUp>
        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
          {[
            { n: "01", icon: FileText,    title: "Share your data",      desc: "Upload a CSV or connect your bank. 30 minutes. No accountant meetings." },
            { n: "02", icon: Brain,       title: "We do the work",       desc: "AI categorizes and analyses every transaction. Accountants review and finalise." },
            { n: "03", icon: CheckCircle2,title: "Get clean financials", desc: "P&L, balance sheet, cash flow delivered by the 5th — reviewed and tax-ready." },
          ].map((s, i) => (
            <Card key={s.n}>
              <div className="relative p-6 rounded-2xl border border-border/50 bg-card/60 h-full group hover:border-emerald-500/20 transition-all duration-300 hover:shadow-lg">
                {i < 2 && (
                  <div className="absolute top-10 -right-3 hidden sm:block z-10">
                    <ChevronRight className="h-5 w-5 text-border/50" />
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/8 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300 shadow-md shadow-emerald-500/10">
                  <s.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-5xl font-black text-emerald-500/8 absolute top-4 right-5 select-none">{s.n}</span>
                <h3 className="text-base font-bold text-foreground mb-2.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </Card>
          ))}
        </Stagger>
      </section>

      {/* ── AI callout ── */}
      <section className="relative border-y border-border/40 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0a0f1e] via-background to-[#0d0820] dark:from-[#050810] dark:via-background dark:to-[#08050f]" />
        <div className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <motion.div animate={{ x: [0,40,0], y:[0,-30,0] }} transition={{ duration:18, repeat:Infinity, ease:"easeInOut" }}
          className="absolute -z-10 top-0 right-0 w-[600px] h-[400px] bg-gradient-radial from-violet-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <FadeUp>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-4 block">AI Intelligence</span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-5">AI that actually knows your numbers</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Ledgr AI runs on Llama 3.3 70B — open-source and built into your account at no extra cost.
                Ask it anything with live access to your actual financial data.
              </p>
              <div className="flex flex-wrap gap-2">
                {["What's my runway at current burn?","Which expenses are tax deductible?","Do I have overdue invoices?","Summarise my Q2 performance"].map((q,i) => (
                  <motion.span key={q} initial={{ opacity:0, scale:0.9 }} whileInView={{ opacity:1, scale:1 }}
                    whileHover={{ scale:1.04, borderColor:"rgba(99,102,241,0.4)" }}
                    transition={{ delay:i*0.08, duration:0.3 }} viewport={{ once:true }}
                    className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-muted-foreground cursor-default hover:bg-white/[0.07] transition-all duration-200">
                    &ldquo;{q}&rdquo;
                  </motion.span>
                ))}
              </div>
            </FadeUp>

            {/* mock AI chat */}
            <FadeUp delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/15 via-violet-500/10 to-transparent rounded-3xl blur-2xl" />
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d1117] shadow-2xl">
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/90">Ledgr AI</p>
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" /> Connected to live books
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 min-h-[200px]">
                    <div className="flex justify-end">
                      <div className="bg-indigo-500/20 border border-indigo-500/20 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-white/90 max-w-[78%]">
                        What&apos;s my runway at current burn?
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/40 to-violet-500/40 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-3 w-3 text-blue-300" />
                      </div>
                      <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-white/75 max-w-[85%] leading-relaxed">
                        Based on your{" "}
                        <span className="text-white/95 font-medium">$15,460 net profit</span> this month and current cash of{" "}
                        <span className="text-white/95 font-medium">$84,200</span>, your runway is{" "}
                        <span className="text-emerald-400 font-bold">~14 months</span> at current burn. No overdue invoices. ✓
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] p-3">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/25">Ask anything about your finances…</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <FadeUp className="text-center mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">Social proof</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">What clients say</h2>
        </FadeUp>
        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { q: "Switched from Bench after they shut down. Ledgr onboarded us in 2 hours and had our first P&L by the 5th. Absolutely seamless.", name: "Sarah K.", role: "Founder, e-commerce", initials: "SK", color: "from-emerald-500 to-teal-500" },
            { q: "Finally stopped doing my own bookkeeping. The AI catches things my old accountant missed, and it costs 3x less. Genuinely impressed.", name: "Marcus T.", role: "Freelance consultant", initials: "MT", color: "from-blue-500 to-indigo-500" },
            { q: "The AI assistant is the real deal. Asked about my Q2 margins and got a detailed breakdown in seconds, with actual numbers from my books.", name: "Priya L.", role: "SaaS founder", initials: "PL", color: "from-violet-500 to-purple-500" },
          ].map((t) => (
            <GlowCard key={t.name} glow="emerald">
              <div className="h-full bg-card border border-border/60 rounded-2xl p-6 hover:border-border transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_,i)=><Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic mb-5">&ldquo;{t.q}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0`}>
                    <span className="text-[11px] font-black text-white">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          ))}
        </Stagger>
      </section>

      {/* ── Who it's for ── */}
      <section className="border-t border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <FadeUp className="text-center mb-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">Who it&apos;s for</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Built for founders done doing their own books</h2>
          </FadeUp>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon:Users,      title:"Founders & freelancers",         desc:"You're running a business, not an accounting department. Hand off your books entirely and get back to work.", from:"from-emerald-500/15",to:"to-teal-500/5",ic:"text-emerald-400",glow:"emerald" },
              { icon:TrendingUp, title:"Companies replacing Bench",      desc:"Bench shut down. We're built for exactly this: full accounting service, better AI, lower cost, immediate onboarding.", from:"from-blue-500/15",to:"to-indigo-500/5",ic:"text-blue-400",glow:"blue" },
              { icon:Clock,      title:"Businesses outsourcing today",   desc:"Already paying $1,200–$2,000/month to a bookkeeper? We deliver the same output at a fraction of the cost.", from:"from-violet-500/15",to:"to-purple-500/5",ic:"text-violet-400",glow:"violet" },
            ].map((w) => (
              <GlowCard key={w.title} glow={w.glow}>
                <div className="h-full bg-card border border-border/60 rounded-2xl p-6 hover:border-border transition-all duration-300 group">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${w.from} ${w.to} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <w.icon className={`h-5 w-5 ${w.ic}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2.5 text-[15px]">{w.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{w.desc}</p>
                </div>
              </GlowCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400 mb-4 block">Pricing</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-4">Service pricing</h2>
          <p className="text-muted-foreground text-lg">First month free · Cancel anytime · No setup fees</p>
        </FadeUp>
        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-5" delay={0.1}>
          {pricing.map((plan) => (
            <Card key={plan.name}>
              <div className={`relative h-full flex flex-col rounded-2xl border p-8 overflow-hidden transition-all duration-300 ${
                plan.hot
                  ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/8 to-transparent shadow-2xl shadow-emerald-500/15"
                  : "border-border/60 bg-card hover:border-border hover:shadow-xl"
              }`}>
                {plan.hot && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                    <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black text-[11px] font-black px-4 py-1 rounded-full shadow-lg shadow-emerald-500/40">
                        <Star className="h-3 w-3 fill-black" /> Most Popular
                      </span>
                    </div>
                  </>
                )}
                <div className="mb-6 mt-2">
                  <h3 className="font-black text-foreground text-xl mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-5">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <motion.span initial={{ opacity:0, scale:0.5 }} whileInView={{ opacity:1, scale:1 }}
                      transition={{ type:"spring", stiffness:160, damping:14 }} viewport={{ once:true }}
                      className="text-5xl font-black text-foreground">${plan.price}</motion.span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Link href={`/register?plan=${plan.slug}`}>
                  <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
                    <Button className={`w-full h-11 font-semibold relative overflow-hidden ${
                      plan.hot
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 border-0"
                        : ""
                    }`} variant={plan.hot ? "default" : "outline"}>
                      {plan.hot && (
                        <motion.div animate={{ x:["-100%","100%"] }} transition={{ duration:2.5, repeat:Infinity, ease:"linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                      )}
                      <span className="relative z-10">{plan.cta}</span>
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </Card>
          ))}
        </Stagger>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative border-t border-border/40 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-950/40 via-background to-background" />
        <div className="absolute inset-0 -z-10 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <motion.div animate={{ scale:[1, 1.1, 1], opacity:[0.5,0.8,0.5] }} transition={{ duration:8, repeat:Infinity, ease:"easeInOut" }}
          className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-500/12 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 py-28 text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400 mb-7">
              <Star className="h-3 w-3 fill-emerald-400" /> Join 500+ businesses
            </div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.02em] text-foreground mb-5 leading-[1.0]">
              Stop buying<br />accounting software.
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Start getting it done.
              </span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Total spend on accounting services is many times larger than spend on accounting software.
              We&apos;re replacing the service — not just improving the tool.
            </p>
            <Link href="/register?plan=starter">
              <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }} className="inline-block">
                <Button size="lg" className="relative h-14 px-12 text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-2xl shadow-emerald-500/40 overflow-hidden border-0">
                  <span className="relative z-10 flex items-center gap-2">Get Started Free <ArrowRight className="h-4 w-4" /></span>
                  <motion.div animate={{ x:["-100%","100%"] }} transition={{ duration:2.5, repeat:Infinity, ease:"linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
                </Button>
              </motion.div>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground">First month free · No credit card required · Cancel anytime</p>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 bg-card/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
              <span className="text-black font-black text-[10px]">L</span>
            </div>
            <span className="font-bold text-foreground">Ledgr</span>
            <span className="text-xs">· AI-native accounting firm</span>
          </div>
          <p className="text-xs">© 2026 Ledgr. We do your accounting.</p>
          <div className="flex gap-5 text-xs">
            {["Privacy","Terms","Contact"].map((l)=>(
              <Link key={l} href="#" className="hover:text-foreground transition-colors duration-200">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
