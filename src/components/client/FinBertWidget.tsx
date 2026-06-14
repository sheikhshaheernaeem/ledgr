"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Loader2, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

interface Result {
  label: "positive" | "neutral" | "negative";
  score: number;
  scores: { positive: number; neutral: number; negative: number };
  signals: string[];
  highlights: string[];
  source: "finbert" | "heuristic";
  modelId: string;
  latencyMs: number;
}

const labelStyle: Record<Result["label"], { bg: string; text: string; icon: typeof TrendingUp }> = {
  positive: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-500 dark:text-emerald-400", icon: TrendingUp },
  negative: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-500 dark:text-rose-400", icon: TrendingDown },
  neutral: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-500 dark:text-blue-400", icon: Minus },
};

export function FinBertWidget() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function analyze() {
    if (text.trim().length < 10) {
      toast.error("Paste at least a sentence of financial text.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/finbert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Result;
      setResult(data);
    } catch {
      toast.error("Analysis failed");
    } finally { setLoading(false); }
  }

  const style = result ? labelStyle[result.label] : null;
  const Icon = style?.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/40 bg-card/60 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
          <Brain className="h-3 w-3" /> finbert · financial_sentiment
        </p>
        <span className="font-mono text-[10px] text-muted-foreground">yiyanghkust/finbert-tone</span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Paste a paragraph from your latest financial statement, MD&amp;A, or earnings narrative. We classify tone and surface key signals.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="e.g. Revenue grew 24% YoY driven by stronger SaaS retention. Margin expansion of 4pts. Some pressure from increased CAC."
            className="text-sm font-mono"
          />
        </div>

        <Button
          onClick={analyze}
          disabled={loading || text.trim().length < 10}
          className="bg-blue-500 hover:bg-blue-400 text-white font-semibold w-full"
        >
          {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />analyzing…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyze tone</>}
        </Button>

        {result && style && Icon && (
          <div className={`rounded-lg border p-3 ${style.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${style.text}`} />
                <span className={`font-semibold text-sm uppercase tracking-wider ${style.text}`}>{result.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Math.round(result.score * 100)}% confidence
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {result.source === "finbert" ? "finbert" : "heuristic"} · {result.latencyMs}ms
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {(["positive", "neutral", "negative"] as const).map((k) => (
                <div key={k} className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="text-sm font-mono text-foreground">{Math.round(result.scores[k] * 100)}%</p>
                </div>
              ))}
            </div>

            {result.signals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">signals_detected</p>
                <div className="flex flex-wrap gap-1">
                  {result.signals.map((s) => (
                    <span key={s} className="font-mono text-[10px] border border-border bg-background/50 text-muted-foreground px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.highlights.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">key_sentences</p>
                <ul className="space-y-1.5">
                  {result.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-muted-foreground italic leading-relaxed">“{h}”</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
