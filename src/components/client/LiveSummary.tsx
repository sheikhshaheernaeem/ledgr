"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrendingUp, TrendingDown, FileText, Loader2, CheckCircle2, AlertCircle, Activity,
} from "lucide-react";

interface Summary {
  total_documents: number;
  processed_documents: number;
  processing_documents: number;
  failed_documents: number;
  total_income: number;
  total_expense: number;
  net_profit: number;
  transaction_count: number;
  last_processed_at: string | null;
  last_processed_name: string | null;
  last_processed_count: number;
}

const POLL_MS = 2000;

export function LiveSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevProcessed = useRef<number>(0);
  const justAdded = useRef<boolean>(false);
  const [flash, setFlash] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/demo/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: Summary = await res.json();
      // Detect: a new doc just finished processing
      if (data && d.processed_documents > prevProcessed.current) {
        justAdded.current = true;
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
      prevProcessed.current = d.processed_documents;
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, [data]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!data) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading live summary…
        </div>
      </div>
    );
  }

  const isWorking = data.processing_documents > 0;
  const hasData = data.transaction_count > 0;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className={`rounded-2xl border bg-card/40 p-5 transition-colors ${
      flash ? "border-emerald-500/50 bg-emerald-500/[0.04]" : "border-border/60"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> live · auto_refreshing
        </p>
        <div className="flex items-center gap-3">
          {isWorking && (
            <span className="font-mono text-[10px] text-blue-500 uppercase tracking-wider flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> processing {data.processing_documents}…
            </span>
          )}
          {flash && (
            <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> transaction added
            </span>
          )}
          {data.failed_documents > 0 && (
            <span className="font-mono text-[10px] text-rose-500 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" /> {data.failed_documents} failed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Metric
          label="Income"
          value={fmt(data.total_income)}
          icon={TrendingUp}
          color="text-emerald-500"
          hasData={hasData}
        />
        <Metric
          label="Expenses"
          value={fmt(data.total_expense)}
          icon={TrendingDown}
          color="text-rose-500"
          hasData={hasData}
        />
        <Metric
          label="Net profit"
          value={fmt(data.net_profit)}
          icon={Activity}
          color={data.net_profit >= 0 ? "text-blue-500 dark:text-blue-400" : "text-rose-500"}
          accent
          hasData={hasData}
        />
        <Metric
          label="Documents"
          value={`${data.processed_documents}/${data.total_documents}`}
          icon={FileText}
          color="text-foreground"
          sub={`${data.transaction_count} txns extracted`}
          hasData={data.total_documents > 0}
        />
      </div>

      {!hasData && !isWorking && (
        <p className="text-xs text-muted-foreground mt-4 text-center font-mono">
          drop_a_document_below → ai_extracts_transactions → totals_update_here
        </p>
      )}

      {error && (
        <p className="text-[10px] text-rose-500 font-mono mt-2">{error}</p>
      )}
    </div>
  );
}

function Metric({
  label, value, icon: Icon, color, accent, sub, hasData,
}: { label: string; value: string; icon: typeof TrendingUp; color: string; accent?: boolean; sub?: string; hasData: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-background/50 p-3 ${accent ? "shadow-sm" : ""}`}>
      <div className="flex items-center justify-between mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold tracking-tight tabular-nums ${hasData ? color : "text-muted-foreground/40"}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
