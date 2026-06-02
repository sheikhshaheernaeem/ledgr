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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: Zap,
    title: "AI Categorization",
    description:
      "Every transaction categorized automatically using Gemini AI. 95%+ accuracy on day one.",
  },
  {
    icon: Shield,
    title: "Human Review",
    description:
      "Our team reviews every report before it reaches you. No raw AI output — ever.",
  },
  {
    icon: FileText,
    title: "Clean P&L Monthly",
    description:
      "Receive a clear profit & loss statement in your inbox by the 5th of every month.",
  },
  {
    icon: BarChart3,
    title: "Ask Your Books",
    description:
      'Chat with your financial data. "What did I spend on software last quarter?" — answered instantly.',
  },
  {
    icon: TrendingUp,
    title: "Tax-Ready Always",
    description:
      "Books stay organized year-round. Tax season is no longer a nightmare.",
  },
  {
    icon: Clock,
    title: "30-Min Onboarding",
    description:
      "Upload your bank CSV, we handle the rest. No accountant meetings, no setup calls.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: 299,
    description: "For freelancers & solopreneurs",
    features: [
      "Up to 200 transactions/month",
      "Monthly P&L report",
      "AI categorization + human review",
      "Email delivery on the 5th",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: 599,
    description: "For small businesses $10K–$100K/mo",
    features: [
      "Up to 500 transactions/month",
      "Monthly P&L + quarterly review",
      "Tax prep assistance",
      "Cash flow forecasting",
      "Priority support (24h response)",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "CFO",
    price: 1499,
    description: "For growing companies needing more",
    features: [
      "Unlimited transactions",
      "Full CFO-lite service",
      "Dedicated human accountant",
      "Weekly check-ins",
      "Board-ready financials",
    ],
    cta: "Talk to Us",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-emerald-400 tracking-tight">
            Ledgr
          </span>
          <div className="flex items-center gap-3">
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
          className="mb-6 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 inline-block animate-pulse" />
          Replacing your $1,200/month bookkeeper
        </Badge>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
          AI Bookkeeping.
          <br />
          <span className="text-emerald-400">$299/month.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your bank statement. Get a clean P&amp;L every month, reviewed
          by our team, delivered to your inbox. Built for small businesses who
          hate bookkeeping.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-8"
            >
              Start Free — First Month on Us
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
          No credit card required · Cancel anytime · Setup in 30 minutes
        </p>
      </section>

      {/* Social proof bar */}
      <div className="border-y border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-6 items-center justify-center text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Bench alternative — we onboard refugees in 24 hours
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            95%+ AI accuracy, 100% human-reviewed
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Save $900+/month vs traditional bookkeepers
          </span>
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            We handle the entire bookkeeping workflow so you can focus on
            running your business.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload your CSV",
                desc: "Export a CSV from your bank or accounting software. Upload it to Ledgr in seconds.",
              },
              {
                step: "02",
                title: "AI categorizes everything",
                desc: "Gemini AI reads every transaction and assigns categories with confidence scores.",
              },
              {
                step: "03",
                title: "Expert review + delivery",
                desc: "Our team reviews the AI output, fixes edge cases, and delivers your P&L by the 5th.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <span className="text-6xl font-black text-emerald-500/10 select-none">
                  {s.step}
                </span>
                <h3 className="text-lg font-semibold text-white mt-2 mb-2">
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
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
                <h3 className="font-bold text-white text-xl mb-1">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link href="/register">
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
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-card/20">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to fire your bookkeeper?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join businesses saving $900+ per month. First month completely free.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-10"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-bold text-emerald-400">Ledgr</span>
          <p>© 2026 Ledgr. AI Bookkeeping for Small Businesses.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
