import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, X, ArrowRight, Building2, Brain, Shield, Users } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For freelancers and solopreneurs getting started",
    badge: null,
    cta: "Get Started",
    ctaHref: "/register",
    ctaVariant: "outline" as const,
    features: [
      { text: "Up to 100 transactions/month", included: true },
      { text: "Invoices & estimates", included: true },
      { text: "Basic P&L and balance sheet", included: true },
      { text: "Client management", included: true },
      { text: "Bank account tracking", included: true },
      { text: "AI assistant (10 queries/day)", included: true },
      { text: "Multi-currency support", included: false },
      { text: "Payroll & time tracking", included: false },
      { text: "Advanced AI insights", included: false },
      { text: "Team members", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing businesses that need the full picture",
    badge: "Most Popular",
    cta: "Start Free Trial",
    ctaHref: "/register?plan=pro",
    ctaVariant: "default" as const,
    features: [
      { text: "Unlimited transactions", included: true },
      { text: "Everything in Starter", included: true },
      { text: "Multi-currency & FX", included: true },
      { text: "Payroll & time tracking", included: true },
      { text: "Fixed assets & depreciation", included: true },
      { text: "AI assistant (unlimited)", included: true },
      { text: "Anomaly detection & risk scoring", included: true },
      { text: "AI board reports & cohort analysis", included: true },
      { text: "Up to 3 team members", included: true },
      { text: "Multi-entity consolidation", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For accounting firms and complex businesses",
    badge: null,
    cta: "Contact Sales",
    ctaHref: "mailto:shaheer@ledgr.app",
    ctaVariant: "outline" as const,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Multi-entity consolidation", included: true },
      { text: "White-label branding", included: true },
      { text: "Revenue recognition (ASC 606)", included: true },
      { text: "Lease accounting (ASC 842)", included: true },
      { text: "Segregation of Duties compliance", included: true },
      { text: "Custom API & webhooks", included: true },
      { text: "Dedicated onboarding", included: true },
      { text: "SLA & priority support", included: true },
    ],
  },
];

const trust = [
  { icon: Brain, title: "Truly AI-Native", body: "Not AI-bolted-on. Every workflow is designed around AI — categorisation, anomaly detection, cash flow forecasting, board reports." },
  { icon: Shield, title: "Audit-Ready", body: "Double-entry GL, period locks, SoD compliance, full audit log. Built for accountants, not just founders." },
  { icon: Building2, title: "Global by Default", body: "Multi-currency, locale-aware formatting, VAT/GST/Sales Tax support across 150+ countries." },
  { icon: Users, title: "Built for Teams", body: "Invite your accountant, CFO, or bookkeeper. Role-based access for every permission level." },
];

export default function UpgradePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
          <Zap className="h-3 w-3 mr-1" /> Early Access Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-base">
          Start free. Upgrade when you need more. No hidden fees, no per-seat surprises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative flex flex-col ${plan.badge ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" : ""}`}>
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-black font-semibold text-xs px-3 py-1">{plan.badge}</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
              </div>
              <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5">
                    {f.included
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      : <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                    <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.ctaHref}>
                <Button variant={plan.ctaVariant} className={`w-full gap-1.5 ${plan.badge ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold" : ""}`}>
                  {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trust.map(({ icon: Icon, title, body }) => (
          <div key={title} className="p-4 rounded-xl border border-border bg-card space-y-2">
            <Icon className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="text-center p-8 rounded-2xl border border-border bg-gradient-to-br from-emerald-500/5 to-transparent space-y-4">
        <h2 className="text-2xl font-bold">Questions about Enterprise?</h2>
        <p className="text-muted-foreground text-sm">We set up a custom plan for accounting firms managing multiple clients.</p>
        <a href="mailto:shaheer@ledgr.app">
          <Button variant="outline" className="gap-2">
            Talk to the founder <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}
