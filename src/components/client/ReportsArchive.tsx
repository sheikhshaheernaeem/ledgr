"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  month: number;
  year: number;
  status: string;
  totalIncome: number | null;
  totalExpenses: number | null;
  netProfit: number | null;
  aiSummary: string | null;
  createdAt: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function statusStyle(status: string): string {
  switch (status) {
    case "GENERATED": return "border-blue-500/30 bg-blue-500/10 text-blue-500";
    case "APPROVED": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
    case "SENT": return "border-blue-500/30 bg-blue-500/10 text-blue-500";
    case "DRAFT": return "border-border bg-background/60 text-muted-foreground";
    default: return "border-border bg-background/60 text-muted-foreground";
  }
}

export function ReportsArchive({ reports, currency }: { reports: Report[]; currency: string }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const fmt = (n: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  async function regenPdf(reportId: string, kind: "profit_loss" | "expense_summary" | "tax_summary") {
    setBusyId(reportId + ":pdf");
    try {
      // Get transactionIds for this report
      const txnRes = await fetch(`/api/reports/${reportId}/transaction-ids`);
      if (!txnRes.ok) throw new Error("Could not load transactions");
      const { transactionIds } = await txnRes.json();
      if (!transactionIds?.length) throw new Error("No transactions linked to this report");

      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds, reportType: kind }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      triggerDownload(blob, `ledgr-${kind}-${reportId.slice(-6)}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusyId(null); }
  }

  async function downloadCsv(reportId: string) {
    setBusyId(reportId + ":csv");
    try {
      const res = await fetch("/api/ai/generate-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, scope: "report" }),
      });
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      triggerDownload(blob, `ledgr-${reportId.slice(-6)}.csv`);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-base font-semibold text-foreground">
                  {MONTHS[(r.month - 1) % 12] ?? "—"} {r.year}
                </p>
                <span className={`font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 rounded ${statusStyle(r.status)}`}>
                  {r.status.toLowerCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md text-xs font-mono">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider">income</p>
                  <p className="text-emerald-500 font-semibold mt-0.5 tabular-nums">{fmt(r.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider">expenses</p>
                  <p className="text-rose-500 font-semibold mt-0.5 tabular-nums">{fmt(r.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider">net</p>
                  <p className={`font-semibold mt-0.5 tabular-nums ${(r.netProfit ?? 0) >= 0 ? "text-blue-500" : "text-rose-500"}`}>
                    {fmt(r.netProfit)}
                  </p>
                </div>
              </div>
              {r.aiSummary && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{r.aiSummary}</p>
              )}
              <p className="font-mono text-[10px] text-muted-foreground mt-2">
                generated · {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button onClick={() => regenPdf(r.id, "profit_loss")} disabled={!!busyId} size="sm" className="bg-blue-500 hover:bg-blue-400 text-white">
                {busyId === r.id + ":pdf" ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <FileText className="h-3 w-3 mr-1.5" />}
                PDF
              </Button>
              <Button onClick={() => downloadCsv(r.id)} disabled={!!busyId} size="sm" variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
                {busyId === r.id + ":csv" ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-3 w-3 mr-1.5" />}
                CSV
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
