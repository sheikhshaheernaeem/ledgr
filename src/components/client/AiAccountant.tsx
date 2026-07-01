"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles,
  TrendingUp, TrendingDown, Brain, Download, X, ArrowDown, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Txn {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  confidence: number | null;
}

interface PipelineStep { name: string; ok: boolean; ms: number; detail?: string }

interface PipelineResult {
  source: { name: string; mimeType: string; pages?: number; chars: number };
  extraction: { documentType: string; detectedCurrency: string; count: number; notes?: string };
  transactions: Txn[];
  transactionIds: string[];
  totals: { income: number; expenses: number; netProfit: number };
  byCategory: Record<string, { income: number; expense: number; count: number }>;
  sentiment: {
    label: "positive" | "neutral" | "negative";
    score: number;
    signals: string[];
    highlights: string[];
    source: "finbert" | "heuristic";
    modelId: string;
  };
  steps: PipelineStep[];
}

const STEP_LABELS: Record<string, string> = {
  ocr: "OCR scanning image (Tesseract)",
  parse_document: "Parsing document",
  extract_transactions: "Extracting transactions (Llama 3.3)",
  finbert_sentiment: "Analyzing sentiment (FinBERT)",
  persist_transactions: "Saving to your ledger",
};

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

async function ocrImage(file: File, onProgress: (pct: number) => void): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

export function AiAccountant() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasted, setPasted] = useState("");
  const [working, setWorking] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const process = useCallback(async (input: { file?: File; text?: string }) => {
    setError(null);
    setResult(null);
    setWorking(true);
    setOcrProgress(null);

    const fd = new FormData();

    try {
      // If it's an image, OCR in browser first (free, local, no server load)
      if (input.file && input.file.type.startsWith("image/")) {
        setCurrentStep("ocr");
        setOcrProgress(0);
        const text = await ocrImage(input.file, (pct) => setOcrProgress(pct));
        if (text.trim().length < 20) {
          throw new Error("OCR couldn't read enough text from the image. Try a clearer scan.");
        }
        fd.append("text", text);
        fd.append("sourceName", input.file.name);
        setOcrProgress(null);
      } else if (input.file) {
        fd.append("file", input.file);
      } else if (input.text) {
        fd.append("text", input.text);
      }

      setCurrentStep("parse_document");
      const res = await fetch("/api/ai/process-document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pipeline failed");
      setResult(data as PipelineResult);
      setCurrentStep(null);
      toast.success(`Extracted ${data.transactions.length} transactions`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Processing failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setWorking(false);
      setCurrentStep(null);
      setOcrProgress(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void process({ file: f });
  }, [process]);

  const onPasteSubmit = useCallback(() => {
    if (pasted.trim().length < 20) {
      toast.error("Paste at least a paragraph of financial text");
      return;
    }
    void process({ text: pasted });
  }, [pasted, process]);

  const downloadPdf = useCallback(async (kind: "profit_loss" | "expense_summary" | "tax_summary") => {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: result.transactionIds, reportType: kind }),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      triggerDownload(blob, `ledgr-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally { setDownloading(false); }
  }, [result]);

  const downloadCsv = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/ai/generate-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: result.transactionIds, scope: "selected" }),
      });
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      triggerDownload(blob, `ledgr-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally { setDownloading(false); }
  }, [result]);

  const reset = () => { setResult(null); setError(null); setPasted(""); };

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> AI_ACCOUNTANT · v1
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Drop a document. Get books.</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          Upload a PDF bank statement, invoice, or receipt — or paste a financial paragraph. Our AI
          extracts every transaction, classifies it, runs FinBERT sentiment, and gives you a downloadable
          report. No manual data entry.
        </p>
      </div>

      {/* DROP / PASTE */}
      {!result && !working && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`md:col-span-3 rounded-2xl border-2 border-dashed cursor-pointer p-10 text-center transition-all ${
              dragOver
                ? "border-cyan-500 bg-cyan-500/[0.06]"
                : "border-border/60 hover:border-cyan-500/40 hover:bg-cyan-500/[0.03]"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.csv,.txt,image/*,text/plain,text/csv,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void process({ file: f });
              }}
            />
            <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Upload className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
            </div>
            <p className="text-base font-semibold text-foreground">Drop a PDF, image, or CSV</p>
            <p className="text-xs text-muted-foreground mt-1.5">or click to browse · max 8MB</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-3">pdf · jpg · png · csv · txt &nbsp;·&nbsp; images OCR&apos;d locally</p>
          </div>

          {/* Paste text */}
          <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="font-semibold text-foreground text-sm">Or paste text</p>
            <p className="text-xs text-muted-foreground mt-1">
              Have an image / scan? Run OCR on your phone, then paste here.
            </p>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={5}
              className="mt-3 text-xs font-mono"
              placeholder="2026-03-01  STRIPE PAYOUT     +4,250.00&#10;2026-03-02  AWS               -312.40&#10;2026-03-03  SLACK SUBSCRIPTION -42.00"
            />
            <Button onClick={onPasteSubmit} disabled={pasted.trim().length < 20} className="w-full mt-3 bg-cyan-500 hover:bg-cyan-400 text-black">
              <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Process text
            </Button>
          </div>
        </div>
      )}

      {/* LIVE PIPELINE */}
      {working && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">AI is processing your document</p>
              <p className="text-xs text-muted-foreground">
                {STEP_LABELS[currentStep ?? ""] ?? "Uploading…"}
                {currentStep === "ocr" && ocrProgress !== null && ` · ${ocrProgress}%`}
              </p>
            </div>
          </div>
          {currentStep === "ocr" && ocrProgress !== null && (
            <div className="mb-3 h-1.5 bg-cyan-500/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          )}
          <div className="space-y-2">
            {Object.entries(STEP_LABELS).map(([key, label]) => {
              const isCurrent = currentStep === key;
              return (
                <div key={key} className={`flex items-center gap-2 text-xs ${isCurrent ? "text-cyan-500 dark:text-cyan-400" : "text-muted-foreground"}`}>
                  {isCurrent ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDown className="h-3 w-3 opacity-40" />}
                  <span className="font-mono">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Couldn&apos;t process this document</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button onClick={reset} size="sm" variant="outline" className="mt-3">
                <X className="h-3.5 w-3.5 mr-1.5" /> Try a different file
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {result && !working && (
        <div className="space-y-4">
          {/* Source card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{result.source.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {result.extraction.documentType} · {result.extraction.count} transactions · {result.extraction.detectedCurrency}
                </p>
              </div>
            </div>
            <Button onClick={reset} variant="ghost" size="sm">
              <X className="h-3.5 w-3.5 mr-1.5" /> New
            </Button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Total label="Income" value={result.totals.income} positive icon={TrendingUp} currency={result.extraction.detectedCurrency} />
            <Total label="Expenses" value={result.totals.expenses} icon={TrendingDown} currency={result.extraction.detectedCurrency} />
            <Total label="Net profit" value={result.totals.netProfit} positive={result.totals.netProfit >= 0} accent currency={result.extraction.detectedCurrency} />
          </div>

          {/* Download buttons */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">download_reports</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadPdf("profit_loss")} disabled={downloading} className="bg-cyan-500 hover:bg-cyan-400 text-black">
                {downloading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                P&amp;L Statement
              </Button>
              <Button onClick={() => downloadPdf("expense_summary")} disabled={downloading} variant="outline" className="border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Expense Summary
              </Button>
              <Button onClick={() => downloadPdf("tax_summary")} disabled={downloading} variant="outline" className="border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Tax Summary
              </Button>
              <div className="w-px h-8 bg-border self-center" />
              <Button onClick={downloadCsv} disabled={downloading} variant="outline">
                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Transactions table */}
          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/40 bg-card/60 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> extracted_transactions · {result.transactions.length}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">llama-3.3-70b-versatile</p>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-card/40 sticky top-0">
                  <tr className="text-left text-muted-foreground font-mono">
                    <th className="px-3 py-2 font-normal">Date</th>
                    <th className="px-3 py-2 font-normal">Description</th>
                    <th className="px-3 py-2 font-normal">Category</th>
                    <th className="px-3 py-2 font-normal text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {result.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-card/60">
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{t.date.slice(0, 10)}</td>
                      <td className="px-3 py-2 text-foreground">{t.description}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono tabular-nums ${(t.type === "INCOME" || t.amount > 0) ? "text-emerald-500" : "text-rose-500"}`}>
                        {(t.type === "INCOME" || t.amount > 0) ? "+" : "-"}
                        {Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FinBERT sentiment */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
                <Brain className="h-3 w-3" /> finbert · sentiment
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{result.sentiment.modelId} · {result.sentiment.source}</p>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <SentimentBadge label={result.sentiment.label} score={result.sentiment.score} />
              <p className="text-xs text-muted-foreground">
                {result.sentiment.label === "positive" ? "Document tone is upbeat — growth/expansion signals dominate." :
                  result.sentiment.label === "negative" ? "Tone leans concerning — watch for cost pressures and headwinds." :
                  "Tone is neutral — balanced reporting without strong directional signals."}
              </p>
            </div>
            {result.sentiment.signals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.sentiment.signals.map((s) => (
                  <span key={s} className="font-mono text-[10px] border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline log */}
          <details className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
            <summary className="px-4 py-2.5 cursor-pointer text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
              pipeline_log · {result.steps.length} steps · {result.steps.reduce((s, x) => s + x.ms, 0)}ms total
            </summary>
            <div className="px-4 pb-3 space-y-1.5">
              {result.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {s.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-rose-500" />}
                  <span className="font-mono text-muted-foreground">{STEP_LABELS[s.name] ?? s.name}</span>
                  <span className="font-mono text-muted-foreground ml-auto tabular-nums">{s.ms}ms</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function Total({
  label, value, positive, accent, icon: Icon, currency,
}: { label: string; value: number; positive?: boolean; accent?: boolean; icon?: React.ComponentType<{ className?: string }>; currency: string }) {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Math.abs(value));
  const color = accent
    ? (positive ? "text-cyan-500 dark:text-cyan-400" : "text-rose-500")
    : positive
      ? "text-emerald-500"
      : "text-rose-500";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2">
        {Icon ? <Icon className={`h-4 w-4 ${color}`} /> : <span className={`w-2.5 h-2.5 rounded-full ${color.replace("text-", "bg-")}`} />}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>
        {value < 0 ? "−" : ""}{fmt}
      </p>
    </div>
  );
}

function SentimentBadge({ label, score }: { label: "positive" | "neutral" | "negative"; score: number }) {
  const map = {
    positive: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500", icon: TrendingUp },
    neutral:  { bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-500", icon: Brain },
    negative: { bg: "bg-rose-500/10 border-rose-500/30 text-rose-500", icon: TrendingDown },
  } as const;
  const cfg = map[label];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-lg border px-3 py-1.5 ${cfg.bg} inline-flex items-center gap-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold text-sm uppercase tracking-wider">{label}</span>
      <span className="font-mono text-[10px] opacity-80">{Math.round(score * 100)}%</span>
    </div>
  );
}
