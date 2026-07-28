"use client";

import { Sparkles, FileText } from "lucide-react";
import { useMode } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";

const OPTIONS: { value: Family; label: string; icon: typeof Sparkles; activeClass: string }[] = [
  { value: "ai", label: "AI Accountant", icon: Sparkles, activeClass: "bg-cyan-500 text-black" },
  { value: "bookkeeping", label: "Book keeping", icon: FileText, activeClass: "bg-emerald-500 text-black" },
];

/** Shared AI Accountant / Book keeping switch — used in the marketing nav, login, register, and the client sidebar. */
export function ModeToggle({
  className = "",
  compact = false,
  onSelect,
}: {
  className?: string;
  compact?: boolean;
  /** Extra side effect on click (e.g. navigating to the family's home page) — fires after the mode is set. */
  onSelect?: (mode: Family) => void;
}) {
  const { mode, setMode } = useMode();

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/50 p-1 ${className}`}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setMode(opt.value); onSelect?.(opt.value); }}
            title={opt.label}
            className={`flex items-center gap-1.5 rounded-full font-semibold transition-colors ${
              compact ? "px-2 py-1.5 text-xs" : "px-3.5 py-1.5 text-sm"
            } ${active ? opt.activeClass : "text-muted-foreground hover:text-foreground"}`}
          >
            <opt.icon className="h-3.5 w-3.5 shrink-0" />
            {!compact && opt.label}
          </button>
        );
      })}
    </div>
  );
}
