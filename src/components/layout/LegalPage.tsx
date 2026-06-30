import { Sparkles } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <section className="border-b border-border/60 relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.10]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-blue-500 dark:text-blue-400">
            <Sparkles className="h-3 w-3" /> {eyebrow}
          </span>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.06]">
            {title}
          </h1>
          <p className="mt-5 font-mono text-xs text-muted-foreground">Last updated: {updated}</p>
          {intro ? (
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">{intro}</p>
          ) : null}
        </div>
      </section>

      {/* Body */}
      <section className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">{children}</div>
      </section>

      <PublicFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{heading}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5 list-disc marker:text-blue-500/70">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
