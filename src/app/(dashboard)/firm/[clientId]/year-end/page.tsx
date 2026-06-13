"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Lock, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Check {
  id: string;
  label: string;
  done: boolean;
  detail: string;
}

export default function YearEndPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  // eslint-disable-next-line react-hooks/purity
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [checklist, setChecklist] = useState<Check[]>([]);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/year-end?clientId=${clientId}&year=${year}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChecklist(data.checklist ?? []);
      setCompleted(data.progress?.completed ?? 0);
    } catch {
      toast.error("Failed to load checklist");
    } finally { setLoading(false); }
  }, [clientId, year]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // eslint-disable-next-line react-hooks/purity
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const pct = checklist.length > 0 ? (completed / checklist.length) * 100 : 0;
  const allDone = checklist.length > 0 && completed === checklist.length;

  return (
    <div className="space-y-6">
      <Link href={`/firm/${clientId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        <ArrowLeft className="h-3 w-3" /> back to workspace
      </Link>

      <div className="border-b border-border/60 pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> firm / year_end
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Year-end close</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete these steps before locking the year and handing financials to the client/auditor.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="h-10 border border-input bg-background rounded-md px-3 text-sm font-mono"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex justify-between items-baseline mb-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            year_end_progress
          </p>
          <p className="font-mono text-sm font-semibold">
            {completed} / {checklist.length} {allDone && "✓"}
          </p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${allDone ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="space-y-2">
          {checklist.map((c) => {
            const Icon = c.done ? CheckCircle2 : Circle;
            return (
              <li
                key={c.id}
                className={`rounded-lg border p-4 flex items-start gap-3 ${
                  c.done ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-border/60 bg-card/40"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${c.done ? "text-emerald-400" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${c.done ? "text-foreground" : "text-foreground"}`}>{c.label}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.detail}</p>
                </div>
                {c.done && (
                  <span className="font-mono text-[10px] uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 px-2 py-0.5 rounded">
                    done
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {allDone && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-medium text-foreground">Ready to lock year {year}</p>
          <p className="text-sm text-muted-foreground mt-1">
            All steps complete. Lock the periods to prevent further changes.
          </p>
        </div>
      )}
    </div>
  );
}
