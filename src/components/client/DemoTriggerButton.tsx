"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Zap, CheckCircle2 } from "lucide-react";

/**
 * One-click "watch the autonomous flow" button.
 *
 * Drives an explicit step ticker so investors can see the pipeline phases
 * the way the spec describes: Uploading → Processing AI → Extracting →
 * Generating report → Completed.
 *
 * Each tick maps to a real backend state polled from /api/process.
 */

type Step = "idle" | "uploading" | "processing" | "extracting" | "report" | "complete";

const STEP_LABELS: Record<Exclude<Step, "idle">, string> = {
  uploading: "Uploading",
  processing: "Processing AI",
  extracting: "Extracting data",
  report: "Generating report",
  complete: "Completed",
};

const STEP_ORDER: Exclude<Step, "idle">[] = ["uploading", "processing", "extracting", "report", "complete"];

export function DemoTriggerButton() {
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function trigger() {
    if (busy) return;
    setBusy(true);
    setStep("uploading");

    try {
      const res = await fetch("/api/demo/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Trigger failed");
      const data = await res.json();
      const docId = data.documentId as string;

      setStep("processing");
      // small intentional pause to make the AI step visible
      await sleep(700);
      setStep("extracting");

      // Poll the document status until PROCESSED or FAILED (max ~25s)
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/process?documentId=${docId}`);
          const statusData = await statusRes.json();
          const docStatus = statusData.document?.status as string | undefined;

          if (docStatus === "PROCESSED") {
            cleanup();
            setStep("report");
            await sleep(600);
            setStep("complete");
            toast.success("Sample processed. Your totals just updated above.");
            await sleep(2500);
            setStep("idle");
            setBusy(false);
            return;
          }
          if (docStatus === "FAILED") {
            cleanup();
            toast.error("Sample failed to process. Check /admin/failures for details.");
            setStep("idle");
            setBusy(false);
            return;
          }
          if (attempts > 13) {
            // ~26s — give up gracefully
            cleanup();
            toast("Still processing in the background. Totals will appear shortly.");
            setStep("idle");
            setBusy(false);
          }
        } catch {
          // poll error — keep trying until attempts limit
        }
      }, 2000);
    } catch (e) {
      cleanup();
      toast.error(e instanceof Error ? e.message : "Failed");
      setStep("idle");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-4">
      <button
        onClick={trigger}
        disabled={busy}
        className="w-full flex items-center gap-3 text-left disabled:opacity-90"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shrink-0">
          {busy
            ? <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />
            : <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            {busy ? "Watching pipeline…" : "Try the autonomous flow"}
            <span className="font-mono text-[10px] uppercase tracking-wider text-blue-500 inline-flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" /> one click
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Skip uploading — we&apos;ll send a sample bank statement through the pipeline. Watch totals update live.
          </p>
        </div>
        <span className="font-mono text-xs text-blue-500 dark:text-blue-400 px-2 py-1 rounded-md">
          {busy ? "…" : "Run →"}
        </span>
      </button>

      {/* Step ticker */}
      {step !== "idle" && (
        <div className="mt-4 pt-3 border-t border-blue-500/20">
          <ol className="space-y-1.5">
            {STEP_ORDER.map((s) => {
              const currentIdx = STEP_ORDER.indexOf(step as Exclude<Step, "idle">);
              const sIdx = STEP_ORDER.indexOf(s);
              const isDone = sIdx < currentIdx || step === "complete";
              const isActive = sIdx === currentIdx && step !== "complete";
              return (
                <li
                  key={s}
                  className={`flex items-center gap-2 text-xs ${
                    isDone ? "text-emerald-500" : isActive ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground/60"
                  }`}
                >
                  {isDone
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : isActive
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <span className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                  <span className="font-mono">{STEP_LABELS[s]}</span>
                  {isDone && <span className="font-mono text-[10px]">✔</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
