import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Mail, Clock, Shield, Brain } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: 299,
    description: "For freelancers & solopreneurs",
    badge: null,
    cta: "Upgrade to Starter",
    ctaHref: "mailto:shaheer@ledgr.app?subject=Upgrade to Starter Plan",
    ctaVariant: "outline" as const,
    features: [
      "Up to 200 transactions/month",
      "Monthly P&L report",
      "AI categorization + human review",
      "Email delivery on the 5th",
      "Dedicated support",
    ],
  },
  {
    name: "Growth",
    price: 599,
    description: "For small businesses $10K–$100K/mo",
    badge: "Most Popular",
    cta: "Upgrade to Growth",
    ctaHref: "mailto:shaheer@ledgr.app?subject=Upgrade to Growth Plan",
    ctaVariant: "default" as const,
    features: [
      "Up to 500 transactions/month",
      "Monthly P&L + quarterly review",
      "Tax prep assistance",
      "Cash flow forecasting",
      "Priority support (24h response)",
    ],
  },
  {
    name: "CFO",
    price: 1499,
    description: "For growing companies needing more",
    badge: null,
    cta: "Talk to Us",
    ctaHref: "mailto:shaheer@ledgr.app?subject=CFO Plan Enquiry",
    ctaVariant: "outline" as const,
    features: [
      "Unlimited transactions",
      "Full CFO-lite service",
      "Dedicated human accountant",
      "Weekly check-ins",
      "Board-ready financials",
    ],
  },
];

const trust = [
  { icon: Brain, title: "AI-Categorized", body: "Every transaction categorized by AI on the same day you upload your CSV." },
  { icon: Shield, title: "Human-Reviewed", body: "Our team checks every report before it goes out. No raw AI output — ever." },
  { icon: Clock, title: "Delivered by the 5th", body: "Clean P&L in your inbox every month, without you lifting a finger." },
  { icon: Mail, title: "Reply-Based Support", body: "Questions? Just reply to your report email. We respond within 24 hours." },
];

export default function UpgradePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
          AI Bookkeeping Service
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Your books, done for you</h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-base">
          Upload your bank statement. We handle everything else — categorization, review, and delivery. First month free.
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
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <a href={plan.ctaHref}>
                <Button variant={plan.ctaVariant} className={`w-full gap-1.5 ${plan.badge ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold" : ""}`}>
                  {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </a>
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
        <h2 className="text-2xl font-bold">Questions about your plan?</h2>
        <p className="text-muted-foreground text-sm">Reply to any report email or reach out directly — we respond same day.</p>
        <a href="mailto:shaheer@ledgr.app">
          <Button variant="outline" className="gap-2">
            Talk to the founder <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}
