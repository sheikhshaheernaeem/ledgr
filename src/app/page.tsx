"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  FileText,
  Zap,
  Brain,
  Users,
  Sparkles,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const stagger = (delay = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerGrid({ children, className = "", delay = 0.08 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger(delay)}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CardItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── data ─── */
const services = [
  { icon: Zap, title: "Monthly Bookkeeping", description: "We categorize every transaction, reconcile your accounts, and deliver clean books by the 5th of every month.", color: "from-emerald-500/20 to-teal-500/10", iconColor: "text-emerald-400" },
  { icon: FileText, title: "P&L + Financial Reports", description: "Profit & loss, balance sheet, and cash flow — prepared, reviewed, and delivered. No logging in to generate reports yourself.", color: "from-blue-500/20 to-indigo-500/10", iconColor: "text-blue-400" },
  { icon: Brain, title: "AI Financial Intelligence", description: "Ask Ledgr AI anything about your finances. Real answers backed by your live data, not generic chatbot advice.", color: "from-violet-500/20 to-purple-500/10", iconColor: "text-violet-400" },
  { icon: TrendingUp, title: "Tax Preparation", description: "Books organized year-round so tax season isn't a crisis. We handle prep, you review and approve. That's it.", color: "from-orange-500/20 to-amber-500/10", iconColor: "text-orange-400" },
  { icon: Shield, title: "Human Expert Review", description: "Every report is reviewed by a real accountant before it reaches you. AI does the heavy lifting. Humans ensure accuracy.", color: "from-rose-500/20 to-pink-500/10", iconColor: "text-rose-400" },
  { icon: BarChart3, title: "Cash Flow Forecasting", description: "We model your runway, flag issues early, and surface insights so you make decisions with data — not gut instinct.", color: "from-cyan-500/20 to-sky-500/10", iconColor: "text-cyan-400" },
];

const pricing = [
  {
    name: "Starter", price: 299, description: "Freelancers & solopreneurs", slug: "starter",
    features: ["Up to 200 transactions/month", "Monthly P&L delivered to inbox", "AI categorization + human review", "Ledgr AI financial assistant", "Email support"],
    cta: "Start Free — First Month on Us", highlighted: false,
  },
  {
    name: "Growth", price: 599, description: "Small businesses $10K–$100K/mo", slug: "growth",
    features: ["Up to 500 transactions/month", "Monthly P&L + quarterly deep-dive", "Tax prep included", "Cash flow forecasting", "Priority support (24h response)"],
    cta: "Start Free — First Month on Us", highlighted: true,
  },
  {
    name: "CFO", price: 1499, description: "Growing companies that need more", slug: "cfo",
    features: ["Unlimited transactions", "Dedicated human accountant", "Weekly check-ins", "Board-ready financials", "Full fractional CFO service"],
    cta: "Talk to Us", highlighted: false,
  },
];

const evolution = [
  { era: "Traditional", label: "Outsourced Service", desc: "Hired a bookkeeper. Expensive, slow, opaque.", muted: true },
  { era: "2010s", label: "SaaS Software", desc: "QuickBooks, Xero. Better tools — you still do the work.", muted: true },
  { era: "2023–2025", label: "AI Copilot", desc: "AI-assisted tools. Still software. Still your job.", muted: true },
  { era: "Now", label: "AI-Native Service", desc: "We do the work. You get the output. This is Ledgr.", muted: false },
];

const stats = [
  { value: "500+", label: "Businesses served" },
  { value: "$50M+", label: "Transactions processed" },
  { value: "99.9%", label: "On-time delivery" },
  { value: "70%", label: "Avg. cost savings" },
];

const aiQuestions = [
  "What's my runway at current burn?",
  "Which expenses are tax deductible?",
  "Do I have overdue invoices?",
  "Summarise my Q2 performance",
];

/* ─── page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* Navbar */}
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <span className="text-black font-black text-xs">L</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Ledgr</span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 dark:text-emerald-400 bg-emerald-500/8 hidden sm:inline-flex">
              AI-native
            </Badge>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#services" className="hover:text-foreground transition-colors">Services</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log in</Button></Link>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-md shadow-emerald-500/25">Get Started</Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-emerald-500/8 via-transparent to-transparent rounded-full blur-2xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-gradient-radial from-blue-500/5 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 left-0 w-[300px] h-[300px] bg-gradient-radial from-violet-500/5 via-transparent to-transparent rounded-full blur-3xl" />
          {/* dot grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 inline-flex"
        >
          <Badge className="border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-2 px-4 py-1.5 text-xs font-medium rounded-full">
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
            />
            We don&apos;t sell software — we do the accounting
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
          className="text-5xl sm:text-[5.5rem] font-black tracking-tight leading-[1.02] mb-6"
        >
          Your accounting,
          <br />
          <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            done for you.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Ledgr is an AI-native accounting firm. We handle your books, reports, and tax prep
          end-to-end — powered by open-source AI and reviewed by expert accountants.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-5"
        >
          <Link href="/register?plan=starter">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-base px-8 shadow-xl shadow-emerald-500/30 border-0 h-12">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </Link>
          <Link href="#pricing">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="text-base px-8 h-12 border-border/60 hover:border-border">See Pricing</Button>
            </motion.div>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-muted-foreground flex items-center justify-center gap-4"
        >
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> First month free</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No credit card</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Setup in 30 min</span>
        </motion.p>

        {/* Hero dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-16 relative mx-auto max-w-3xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-violet-500/20 rounded-2xl blur-xl" />
          <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden">
            {/* mock browser bar */}
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
              </div>
              <div className="flex-1 mx-4 bg-background/50 rounded-md h-5 text-[10px] text-muted-foreground flex items-center px-2">app.ledgr.ai/dashboard</div>
            </div>
            {/* mock dashboard content */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: "Revenue MTD", value: "$24,800", change: "+12%", up: true },
                { label: "Expenses MTD", value: "$9,340", change: "-3%", up: false },
                { label: "Net Profit", value: "$15,460", change: "+22%", up: true },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-[11px] text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-xs font-medium mt-1 ${stat.up ? "text-emerald-400" : "text-rose-400"}`}>{stat.change} vs last month</p>
                </div>
              ))}
              <div className="col-span-3 rounded-xl border border-border/60 bg-background/60 p-4">
                <p className="text-[11px] text-muted-foreground mb-3">Cash Flow — Last 6 Months</p>
                <div className="flex items-end gap-2 h-16">
                  {[55, 70, 45, 80, 65, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.06, ease: "easeOut" }}
                      className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/80 to-emerald-400/40"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-y border-border/40 bg-gradient-to-r from-card/60 via-card/40 to-card/60"
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <p className="text-3xl font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent mb-1">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Evolution ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-16">
          <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Why Ledgr</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">The next step after AI copilots</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The industry evolved from outsourcing → SaaS → AI copilot. Ledgr is the final step:
            we do the work, you get the result.
          </p>
        </FadeUp>

        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-4 gap-3" delay={0.1}>
          {evolution.map((e, i) => (
            <CardItem key={e.era}>
              <div className="relative flex flex-col h-full">
                {i < evolution.length - 1 && (
                  <ChevronRight className="absolute -right-2 top-6 h-4 w-4 text-border/60 hidden sm:block z-10" />
                )}
                <div className={`rounded-2xl border p-5 h-full flex flex-col gap-2 transition-all duration-300 ${
                  e.muted
                    ? "border-border/50 bg-card/30 opacity-50"
                    : "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${e.muted ? "text-muted-foreground/60" : "text-emerald-500 dark:text-emerald-400"}`}>{e.era}</span>
                  <p className={`font-bold text-sm ${e.muted ? "text-foreground/50" : "text-foreground"}`}>{e.label}</p>
                  <p className={`text-xs leading-relaxed ${e.muted ? "text-muted-foreground/50" : "text-muted-foreground"}`}>{e.desc}</p>
                  {!e.muted && (
                    <div className="mt-auto pt-2">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">You are here</span>
                    </div>
                  )}
                </div>
              </div>
            </CardItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ── Services ── */}
      <section id="services" className="relative border-y border-border/40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-card/40 via-card/20 to-card/40" />
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="text-center mb-16">
            <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">What we do</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Services we perform for you</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              These aren&apos;t features in software. These are services we perform — so you never have to.
            </p>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <CardItem key={s.title}>
                <div className="group relative bg-card border border-border/60 rounded-2xl p-6 h-full overflow-hidden hover:border-border transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-transparent via-transparent to-emerald-500/3" />
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-sm`}>
                    <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-base">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
                </div>
              </CardItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-16">
          <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Process</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How it works</h2>
          <p className="text-muted-foreground text-lg">Three steps. After that, you just wait for your books.</p>
        </FadeUp>

        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative" delay={0.12}>
          {/* connector line */}
          <div className="absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-border to-transparent hidden sm:block" />

          {[
            { step: "01", title: "Share your data", desc: "Upload a CSV from your bank, or connect directly. Takes 30 minutes. No accountant meetings required.", icon: FileText },
            { step: "02", title: "We do the work", desc: "AI categorizes and analyses every transaction. Our accountants review, correct, and finalise everything.", icon: Brain },
            { step: "03", title: "You get clean financials", desc: "P&L, balance sheet, and cash flow delivered to your inbox by the 5th. Reviewed, accurate, tax-ready.", icon: CheckCircle2 },
          ].map((s, i) => (
            <motion.div key={s.step} variants={fadeUp} className="relative text-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10"
              >
                <s.icon className="h-7 w-7 text-emerald-400" />
              </motion.div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
                <span className="text-[10px] font-black text-emerald-500/50 bg-background px-1">{s.step}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </StaggerGrid>
      </section>

      {/* ── AI callout ── */}
      <section className="relative border-y border-border/40 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-950/30 via-background to-violet-950/20" />
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">AI Intelligence</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">AI that actually knows your numbers</h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-6">
                Ledgr AI runs on Llama 3.3 70B — open-source and built into your account at no extra cost.
                Ask it anything with live access to your actual financial data.
              </p>
              <div className="flex flex-wrap gap-2">
                {aiQuestions.map((q, i) => (
                  <motion.span
                    key={q}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.04 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    viewport={{ once: true }}
                    className="text-xs bg-card border border-border/70 rounded-full px-3 py-1.5 text-muted-foreground cursor-default hover:border-blue-500/30 transition-colors"
                  >
                    &ldquo;{q}&rdquo;
                  </motion.span>
                ))}
              </div>
            </FadeUp>

            {/* Mock AI chat */}
            <FadeUp delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/15 to-violet-500/15 rounded-2xl blur-xl" />
                <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-xl">
                  <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2 bg-muted/20">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Ledgr AI</span>
                    <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Live data
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2 justify-end">
                      <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-foreground max-w-[80%]">
                        What&apos;s my runway at current burn?
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-3 w-3 text-blue-400" />
                      </div>
                      <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-muted-foreground max-w-[85%] leading-relaxed">
                        Based on your <span className="text-foreground font-medium">$15,460 net profit</span> this month and current cash of <span className="text-foreground font-medium">$84,200</span>, your runway is approximately <span className="text-emerald-400 font-semibold">14 months</span> at this burn rate. ✓ No overdue invoices.
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border/60 p-3">
                    <div className="bg-muted/30 rounded-xl px-3 py-2 text-sm text-muted-foreground/50">Ask anything about your finances…</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <FadeUp className="text-center mb-14">
          <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Who it&apos;s for</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Built for founders who are done doing their own books</h2>
        </FadeUp>
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Users, title: "Founders & freelancers", desc: "You're running a business, not an accounting department. Hand off your books entirely and get back to what you're good at.", color: "from-emerald-500/15 to-teal-500/5", iconColor: "text-emerald-400", borderHover: "hover:border-emerald-500/30" },
            { icon: TrendingUp, title: "Companies replacing Bench", desc: "Bench shut down. We're built for exactly this: full accounting service, better AI, lower cost, immediate onboarding.", color: "from-blue-500/15 to-indigo-500/5", iconColor: "text-blue-400", borderHover: "hover:border-blue-500/30" },
            { icon: Clock, title: "Businesses outsourcing today", desc: "Already paying $1,200–$2,000/month to a bookkeeper? We deliver the same output at a fraction of the cost.", color: "from-violet-500/15 to-purple-500/5", iconColor: "text-violet-400", borderHover: "hover:border-violet-500/30" },
          ].map((w) => (
            <CardItem key={w.title}>
              <div className={`bg-card border border-border/60 rounded-2xl p-6 h-full ${w.borderHover} transition-all duration-300 hover:shadow-md`}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${w.color} flex items-center justify-center mb-4`}>
                  <w.icon className={`h-5 w-5 ${w.iconColor}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-base">{w.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{w.desc}</p>
              </div>
            </CardItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ── Testimonial strip ── */}
      <FadeUp>
        <div className="border-y border-border/40 bg-card/30">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
              {[
                { quote: "Switched from Bench after they shut down. Ledgr onboarded us in 2 hours and had our first P&L by the 5th.", name: "Sarah K.", role: "Founder, e-commerce" },
                { quote: "Finally stopped doing my own bookkeeping. The AI catches things my old accountant missed, and it costs 3x less.", name: "Marcus T.", role: "Freelance consultant" },
                { quote: "The AI assistant is genuinely useful. I asked about my Q2 margins and got a detailed answer in seconds.", name: "Priya L.", role: "SaaS founder" },
              ].map((t) => (
                <div key={t.name} className="flex flex-col gap-2">
                  <div className="flex gap-0.5 justify-center sm:justify-start">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs font-semibold text-foreground">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-card/10 via-card/30 to-card/10" />
        <div className="max-w-6xl mx-auto px-6 py-24">
          <FadeUp className="text-center mb-16">
            <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Service pricing</h2>
            <p className="text-muted-foreground text-lg">First month free. Cancel anytime. No setup fees.</p>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-6" delay={0.1}>
            {pricing.map((plan) => (
              <CardItem key={plan.name}>
                <div className={`relative rounded-2xl border p-8 h-full flex flex-col transition-all duration-300 ${
                  plan.highlighted
                    ? "border-emerald-500/60 bg-gradient-to-b from-emerald-500/8 to-emerald-500/3 shadow-xl shadow-emerald-500/15"
                    : "border-border/60 bg-card hover:border-border hover:shadow-lg"
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-black text-xs font-bold px-4 shadow-md shadow-emerald-500/30">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground text-xl mb-1">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-5">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.6 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 180, damping: 14 }}
                        viewport={{ once: true }}
                        className="text-5xl font-black text-foreground"
                      >
                        ${plan.price}
                      </motion.span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.slug}`}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        className={`w-full h-11 font-semibold ${plan.highlighted ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-md shadow-emerald-500/25 border-0" : ""}`}
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </CardItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative border-t border-border/40 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-950/30 via-background to-background" />
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-emerald-500/8 via-transparent to-transparent blur-3xl -z-10" />
        <div className="max-w-3xl mx-auto px-6 py-28 text-center">
          <FadeUp>
            <Badge className="border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium rounded-full mb-6 inline-flex">
              Join 500+ businesses
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-5 leading-tight">
              Stop buying accounting software.
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Start getting it done.
              </span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Total spend on accounting services is many times larger than spend on accounting software.
              We&apos;re replacing the service — not just improving the tool.
            </p>
            <Link href="/register?plan=starter">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-base px-12 h-13 shadow-xl shadow-emerald-500/30 border-0">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground">First month free · No credit card required</p>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-black font-black text-[9px]">L</span>
            </div>
            <span className="font-bold text-foreground">Ledgr</span>
            <span className="text-xs">· AI-native accounting firm</span>
          </div>
          <p>© 2026 Ledgr. We do your accounting.</p>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
