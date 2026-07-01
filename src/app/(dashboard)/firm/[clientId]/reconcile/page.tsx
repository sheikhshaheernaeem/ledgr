"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, GitMerge, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface AccountStatus {
  account: {
    id: string; name: string; accountType: string;
    currentBalance: number; currency: string; lastFourDigits: string | null;
  };
  monthly: Array<{
    year: number; month: number;
    reconciliationId: string | null;
    status: string;
    txnCount: number;
    reconciledCount: number;
  }>;
}

const monthName = (m: number) =>
  new Date(2000, m - 1).toLocaleString("en-US", { month: "short" });

const statusStyle: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  READY: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  NO_DATA: "bg-card/60 text-muted-foreground border-border",
};

export default function ReconcilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [accounts, setAccounts] = useState<AccountStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/reconcile?clientId=${clientId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      toast.error("Failed to load reconciliation status");
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <Link href={`/firm/${clientId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        <ArrowLeft className="h-3 w-3" /> back to workspace
      </Link>

      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" /> firm / reconciliation
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Reconciliation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Match each transaction to a bank-statement line. Required before month-end close.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <GitMerge className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No bank accounts</p>
          <p className="text-sm text-muted-foreground mt-1">
            Client has no bank accounts set up. They&apos;ll be auto-created when statements are uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(({ account, monthly }) => (
            <section key={account.id} className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-card/60 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-foreground">
                    {account.name}
                    {account.lastFourDigits && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">···{account.lastFourDigits}</span>
                    )}
                  </h2>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {account.accountType.toLowerCase()} · current balance{" "}
                    {account.currentBalance.toLocaleString("en-US", { style: "currency", currency: account.currency || "USD" })}
                  </p>
                </div>
              </div>

              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[...monthly].reverse().map((m) => {
                  const isComplete = m.status === "COMPLETED";
                  const isReady = m.status === "READY";
                  const isProgress = m.status === "IN_PROGRESS";
                  const Icon =
                    isComplete ? CheckCircle2 :
                    isReady ? CheckCircle2 :
                    isProgress ? Clock :
                    AlertTriangle;
                  const pct = m.txnCount > 0 ? (m.reconciledCount / m.txnCount) * 100 : 0;
                  return (
                    <div key={`${m.year}-${m.month}`} className="rounded-md border border-border/60 bg-background p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {monthName(m.month)} {String(m.year).slice(-2)}
                        </p>
                        <Icon className={`h-3.5 w-3.5 ${
                          isComplete || isReady ? "text-emerald-400" :
                          isProgress ? "text-amber-400" :
                          "text-muted-foreground/50"
                        }`} />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {m.reconciledCount} / {m.txnCount}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {m.txnCount === 0 ? "no_txns" : `${pct.toFixed(0)}% matched`}
                      </p>
                      <span className={`mt-2 inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusStyle[m.status]}`}>
                        {m.status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-mono text-[10px] uppercase tracking-wider mb-2">about_reconciliation</p>
        Every transaction in the books needs to match a line on the bank statement. The system auto-matches
        most based on amount + date; you handle the rest. Monthly closes can&apos;t finalize until reconciliation
        is at 100% for the period.
      </div>
    </div>
  );
}
