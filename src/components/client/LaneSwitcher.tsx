"use client";

import { useState } from "react";
import { Sparkles, UserCog, Zap, Clock } from "lucide-react";
import { AiAccountant } from "./AiAccountant";
import { HumanAccountantRequest } from "./HumanAccountantRequest";

type Lane = "ai" | "human";

export function LaneSwitcher() {
  const [lane, setLane] = useState<Lane>("ai");

  return (
    <div className="space-y-6">
      {/* Lane picker */}
      <div className="rounded-2xl border border-border/60 bg-card/30 p-2 grid grid-cols-2 gap-2 sticky top-0 z-10 backdrop-blur-xl">
        <button
          onClick={() => setLane("ai")}
          className={`rounded-xl p-4 text-left transition-all ${
            lane === "ai"
              ? "bg-cyan-500/[0.10] border border-cyan-500/40 shadow-sm"
              : "bg-transparent border border-transparent hover:bg-card/60"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${lane === "ai" ? "bg-cyan-500/20" : "bg-card"}`}>
              <Sparkles className={`h-3.5 w-3.5 ${lane === "ai" ? "text-cyan-500 dark:text-cyan-400" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-sm font-semibold ${lane === "ai" ? "text-foreground" : "text-muted-foreground"}`}>
              AI Accountant
            </p>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-emerald-500 flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> instant
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-9">
            Drop a document. AI extracts, categorizes, and generates a report — seconds, not days.
          </p>
        </button>

        <button
          onClick={() => setLane("human")}
          className={`rounded-xl p-4 text-left transition-all ${
            lane === "human"
              ? "bg-cyan-500/[0.10] border border-cyan-500/40 shadow-sm"
              : "bg-transparent border border-transparent hover:bg-card/60"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${lane === "human" ? "bg-cyan-500/20" : "bg-card"}`}>
              <UserCog className={`h-3.5 w-3.5 ${lane === "human" ? "text-cyan-500 dark:text-cyan-400" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-sm font-semibold ${lane === "human" ? "text-foreground" : "text-muted-foreground"}`}>
              Real Accountant
            </p>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> 24h SLA
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-9">
            Send a request to a human accountant. Audits, complex tax, judgment calls.
          </p>
        </button>
      </div>

      {/* Lane content */}
      {lane === "ai" ? <AiAccountant /> : <HumanAccountantRequest />}
    </div>
  );
}
