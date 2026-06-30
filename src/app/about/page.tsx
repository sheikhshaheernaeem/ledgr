import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Brain, Target } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-cyan-500 dark:text-cyan-400">
            <Sparkles className="h-3 w-3" /> ABOUT
          </span>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.06]">
            We do the bookkeeping.<br />
            <span className="text-cyan-500 dark:text-cyan-400">You run the business.</span>
          </h1>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-16 space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground font-semibold">Ledgr is an AI-native accounting firm.</span>{" "}
            Not a SaaS tool you log in to and operate yourself — a service you receive, like having a
            bookkeeper on staff. The output is the same: clean books, monthly P&amp;L, balance sheet, cash
            flow, tax-ready financials. The difference is who does the work.
          </p>
          <p>
            In December 2024, Bench.co — the largest bookkeeping service for small businesses — shut down.{" "}
            <span className="text-foreground">Over 10,000 businesses lost their bookkeeper overnight.</span>
            We built Ledgr for exactly that moment. The service model Bench pioneered was right; it just
            needed AI to make the unit economics work at scale.
          </p>
          <p>
            We pair <span className="text-foreground">Llama 3.3 70B</span> (open-source, via Groq){" "}
            with <span className="text-foreground">FinBERT-class sentiment models</span> (Hugging Face) and{" "}
            <span className="text-foreground">Google Gemini</span> for categorization. AI does the heavy
            lifting — parsing CSVs, classifying every transaction, flagging anomalies. Real
            accountants review every report before it reaches you. AI lifts heavy. Humans ensure accuracy.
          </p>
        </div>
      </section>

      {/* What we believe */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">What we believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Belief
              icon={Users}
              title="Service > software"
              body="Bookkeeping is something you want done, not something you want to do. Tools are a means; the output is the end."
            />
            <Belief
              icon={Brain}
              title="AI-native, not AI-bolted-on"
              body="We didn't add AI to bookkeeping software. We started with AI and added the parts a service firm needs around it."
            />
            <Belief
              icon={Target}
              title="Open-source first"
              body="Llama, FinBERT, PostgreSQL, Next.js. We avoid lock-in so we can pass the cost savings to clients."
            />
          </div>
        </div>
      </section>

      {/* Founders / team */}
      <section className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Team</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ledgr is built by founders who&apos;ve shipped products, sold services, and run small businesses.
            Our accounting team has decades of combined experience at firms and in-house at SaaS companies.
            We&apos;re backed by the people who taught us how this industry works — and we&apos;re glad to
            introduce them when it&apos;s relevant.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We&apos;re currently a small team serving a focused set of businesses. If our values resonate
            and you want to work here, write to us at{" "}
            <Link href="/contact" className="text-cyan-500 hover:text-cyan-400">hello@ledgr.app</Link>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Try us for a month.</h2>
          <p className="text-muted-foreground mb-8">First month free. No card up front. Cancel anytime.</p>
          <Link href="/register">
            <Button size="lg" className="h-12 px-7 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold gap-1.5">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function Belief({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center mb-4">
        <Icon className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
