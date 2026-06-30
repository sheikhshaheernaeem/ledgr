import Link from "next/link";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Mail, MessageCircle, FileQuestion, Sparkles } from "lucide-react";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-blue-500 dark:text-blue-400">
            <Sparkles className="h-3 w-3" /> CONTACT
          </span>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.06]">
            Talk to us.
          </h1>
          <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Have a question? Want a demo? Considering a switch from another firm? Drop us a line — humans reply.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Channel icon={Mail} title="Email" body="hello@ledgr.app" sub="Replies within 24h on business days." />
          <Channel icon={MessageCircle} title="Existing clients" body="Use the in-portal chat" sub="Your assigned accountant replies in <2h during business hours." />
          <Channel icon={FileQuestion} title="Sales / demo" body="sales@ledgr.app" sub="Want to see how onboarding works? We'll walk you through it live." />
        </div>
      </section>

      {/* Form */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Or send a message</h2>
            <p className="text-sm text-muted-foreground mt-2">We&apos;ll get back within one business day.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* FAQ-ish footer */}
      <section className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center text-sm text-muted-foreground">
          <p>
            Looking to get started right away?{" "}
            <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium">Create an account</Link>{" "}
            and your assigned accountant will reach out within a business day.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function Channel({ icon: Icon, title, body, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center mb-4">
        <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-base font-mono text-foreground mt-1.5">{body}</p>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{sub}</p>
    </div>
  );
}
