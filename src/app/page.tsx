import Link from "next/link";
import { ArrowRight, Sparkles, FileText } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Reveal, Aurora, Pill } from "@/components/marketing/primitives";

const OPTIONS = [
  {
    href: "/ai",
    icon: Sparkles,
    accent: "cyan",
    title: "AI Accountant",
    tagline: "Your books, run by AI.",
    desc: "AI reads every transaction, categorizes it, and closes your books — instantly. Reviewed by experts when it matters.",
    price: "From $999/mo",
  },
  {
    href: "/bookkeeping",
    icon: FileText,
    accent: "emerald",
    title: "Book keeping",
    tagline: "Your accounting, done for you.",
    desc: "A dedicated bookkeeper reviews every transaction by hand. Not software you use — a service you receive.",
    price: "From $299/mo",
  },
] as const;

export default function ServicePicker() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-emerald-500/25">
      <PublicNav />

      <section className="relative">
        <Aurora />
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-28 sm:pt-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Pill>Two ways to work with Ledgr</Pill>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              Which service do you need?
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Pick one to get started. You can add the other to the same account later.
            </p>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {OPTIONS.map((opt, i) => (
              <Reveal key={opt.href} delay={i * 0.08}>
                <Link
                  href={opt.href}
                  className={`group flex h-full flex-col rounded-3xl border p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 ${
                    opt.accent === "cyan"
                      ? "border-cyan-500/30 bg-card/50 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/10"
                      : "border-emerald-500/30 bg-card/50 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/10"
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                      opt.accent === "cyan"
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-500"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                    }`}
                  >
                    <opt.icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold tracking-tight">{opt.title}</h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{opt.tagline}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{opt.desc}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
                    <span className="text-sm font-semibold">{opt.price}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-1 ${
                        opt.accent === "cyan" ? "text-cyan-500" : "text-emerald-500"
                      }`}
                    >
                      Explore <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
