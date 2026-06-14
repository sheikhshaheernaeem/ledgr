"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Zap } from "lucide-react";

/**
 * One-click "watch the autonomous flow" button.
 *
 * POSTs to /api/demo/trigger which creates a virtual sample document and
 * runs the pipeline in the background. LiveSummary picks up the new
 * transactions via its 3s poll within seconds.
 */
export function DemoTriggerButton() {
  const [busy, setBusy] = useState(false);

  async function trigger() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Trigger failed");
      toast.success("Sample document submitted. Watch your totals update in seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={trigger}
      disabled={busy}
      className="group rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] hover:border-blue-500/50 transition-all p-4 text-left w-full flex items-center gap-3 disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shrink-0">
        {busy
          ? <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />
          : <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
          {busy ? "Submitting sample…" : "Try the autonomous flow"}
          <span className="font-mono text-[10px] uppercase tracking-wider text-blue-500 inline-flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" /> one click
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Skip uploading — we&apos;ll send a sample bank statement through the pipeline. Watch the totals above update live.
        </p>
      </div>
      <span className="font-mono text-xs text-blue-500 dark:text-blue-400 px-2 py-1 rounded-md group-hover:bg-blue-500/10">
        {busy ? "…" : "Run →"}
      </span>
    </button>
  );
}
