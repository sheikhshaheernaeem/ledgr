import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const services = [
  {
    icon: Zap,
    title: "Monthly Bookkeeping",
    description:
      "We categorize every transaction, reconcile your accounts, and deliver clean books by the 5th of every month. You never touch a spreadsheet.",
  },
  {
    icon: FileText,
    title: "P&L + Financial Reports",
    description:
      "Profit & loss, balance sheet, and cash flow — prepared, reviewed, and delivered. No logging in to generate reports yourself.",
  },
  {
    icon: Brain,
    title: "AI Financial Intelligence",
    description:
      "Ask Claude anything about your finances. Get real answers backed by your live data, not generic advice from a chatbot.",
  },
  {
    icon: TrendingUp,
    title: "Tax Preparation",
    description:
      "Books organized year-round so tax season isn't a crisis. We handle prep, you review and approve. That's it.",
  },
  {
    icon: Shield,
    title: "Human Expert Review",
    description:
      "Every report is reviewed by a real accountant before it reaches you. AI does the heavy lifting. Humans ensure accuracy.",
  },
  {
    icon: BarChart3,
    title: "Cash Flow Forecasting",
    description:
      "We model your runway, flag issues early, and surface insights so you make decisions with data — not gut instinct.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: 299,
    description: "Freelancers & solopreneurs",
    slug: "starter",
    features: [
      "Up to 200 transactions/month",
      "Monthly P&L delivered to inbox",
      "AI categorization + human review",
      "Claude AI financial assistant",
      "Email support",
    ],
    cta: "Start Free — First Month on Us",
    highlighted: false,
  },
  {
    name: "Growth",
    price: 599,
    description: "Small businesses $10K–$100K/mo",
    slug: "growth",
    features: [
      "Up to 500 transactions/month",
      "Monthly P&L + quarterly deep-dive",
      "Tax prep included",
      "Cash flow forecasting",
      "Priority support (24h response)",
    ],
    cta: "Start Free — First Month on Us",
    highlighted: true,
  },
  {
    name: "CFO",
    price: 1499,
    description: "Growing companies that need more",
    slug: "cfo",
    features: [
      "Unlimited transactions",
      "Dedicated human accountant",
      "Weekly check-ins",
      "Board-ready financials",
      "Full fractional CFO service",
    ],
    cta: "Talk to Us",
    highlighted: false,
  },
];

const evolution = [
  {
    era: "Traditional",
    label: "Outsourced Service",
    desc: "You hired a bookkeeper or accounting firm. Expensive, slow, opaque.",
    muted: true,
  },
  {
    era: "2010s",
    label: "SaaS Software",
    desc: "QuickBooks, Xero, FreshBooks. Better tools — but you still do the work.",
    muted: true,
  },
  {
    era: "2023–2025",
    label: "AI Copilot",
    desc: "AI-assisted tools. Still software. Still your job to use it.",
    muted: true,
  },
  {
    era: "Now",
    label: "AI-Native Service",
    desc: "We do the work. You get the output. This is Ledgr.",
    muted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              Ledgr
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hidden sm:inline-flex"
            >
              AI-native
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <Badge
          variant="outline"
          className="mb-6 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          We don&apos;t sell software. We do the accounting.
        </Badge>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]">
          Your accounting,
          <br />
          <span className="text-emerald-600 dark:text-emerald-400">done for you.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Ledgr is an AI-native accounting firm. We handle your books, reports,
          and tax prep end-to-end — powered by Claude AI and reviewed by expert
          accountants. You focus on your business.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register?plan=starter">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline" className="text-base px-8">
              See Pricing
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          First month free · No credit card required · Setup in 30 minutes
        </p>
      </section>

      {/* Social proof bar */}
      <div className="border-y border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-6 items-center justify-center text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Not a tool. An accounting firm.
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Powered by Claude AI · reviewed by humans
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Save $900+/month vs traditional bookkeepers
          </span>
        </div>
      </div>

      {/* Evolution section */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The next step after AI copilots
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The history of services is: outsource → SaaS → AI copilot → AI-native.
            Ledgr is the last step: we do the work, you get the result.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {evolution.map((e, i) => (
            <div key={e.era} className="relative">
              {i < evolution.length - 1 && (
                <ChevronRight className="absolute -right-2 top-4 h-4 w-4 text-border hidden sm:block z-10" />
              )}
              <div
                className={`rounded-xl border p-5 h-full transition-colors ${
                  e.muted
                    ? "border-border bg-card/40 opacity-60"
                    : "border-emerald-500/40 bg-emerald-500/5 shadow-sm shadow-emerald-500/10"
                }`}
              >
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  {e.era}
                </p>
                <p
                  className={`font-bold text-sm mb-2 ${
                    e.muted ? "text-foreground/70" : "text-emerald-500 dark:text-emerald-400"
                  }`}
                >
                  {e.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              What we do for you
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              These aren&apos;t features in software. These are services we perform — so you never have to.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground text-lg">
            Three steps. After that, you just wait for your books.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Share your data",
              desc: "Upload a CSV from your bank, or connect directly. Takes 30 minutes. No accountant meetings required.",
            },
            {
              step: "02",
              title: "We do the work",
              desc: "Claude AI categorizes and analyses every transaction. Our accountants review, correct, and finalise.",
            },
            {
              step: "03",
              title: "You get clean financials",
              desc: "P&L, balance sheet, and cash flow delivered to your inbox by the 5th. Reviewed, accurate, tax-ready.",
            },
          ].map((s) => (
            <div key={s.step} className="relative">
              <span className="text-6xl font-black text-emerald-500/10 select-none">
                {s.step}
              </span>
              <h3 className="text-lg font-semibold text-foreground mt-2 mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Claude AI callout */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="h-7 w-7 text-blue-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Powered by Claude — the most capable AI model
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-xl mx-auto">
              Your books are analysed by Claude claude-opus-4-7 — Anthropic&apos;s most capable model. Ask it anything: cash
              position, tax exposure, unexplained charges, runway. It has live access to
              your financial data and gives you real answers, not generic advice.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "What's my runway at current burn?",
                "Which expenses are tax deductible?",
                "Do I have overdue invoices?",
                "Summarise my Q2 performance",
              ].map((q) => (
                <span
                  key={q}
                  className="text-xs bg-card border border-border rounded-full px-3 py-1.5 text-muted-foreground"
                >
                  &ldquo;{q}&rdquo;
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Who this is for
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: "Founders & freelancers",
              desc: "You're running a business, not an accounting department. Hand off your books entirely and get back to work.",
            },
            {
              icon: TrendingUp,
              title: "Companies replacing Bench",
              desc: "Bench shut down. We're built for exactly this: full accounting service, better AI, lower cost.",
            },
            {
              icon: Clock,
              title: "Businesses currently outsourcing",
              desc: "Already paying a bookkeeper $1,200–$2,000/month? We deliver the same output at a fraction of the cost.",
            },
          ].map((w) => (
            <div
              key={w.title}
              className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <w.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{w.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/40 bg-card/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Service pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              First month free. Cancel anytime. No setup fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-8 ${
                  plan.highlighted
                    ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-semibold">
                    Most Popular
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-foreground text-xl mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href={`/register?plan=${plan.slug}`}>
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                        : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Stop buying accounting software.
            <br />
            <span className="text-emerald-600 dark:text-emerald-400">Start getting your accounting done.</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Total spend on accounting services is many times larger than spend on accounting software.
            We&apos;re replacing the service — not just improving the tool.
          </p>
          <Link href="/register?plan=starter">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-10"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            First month free · No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Ledgr</span>
            <span className="text-xs">AI-native accounting firm</span>
          </div>
          <p>© 2026 Ledgr. We do your accounting.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
