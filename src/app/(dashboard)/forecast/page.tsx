"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";

interface ForecastMonth { month: number; year: number; predictedIncome: number; predictedExpenses: number; predictedNet: number; confidence: number; notes?: string; }
interface Forecast { id: string; generatedAt: string; narrative: string | null; forecastJson: string; }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const res = await fetch("/api/forecast");
    if (res.ok) { const d = await res.json(); setForecast(d); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/forecast", { method: "POST" });
    if (res.ok) { const d = await res.json(); setForecast(d); toast.success("Forecast generated"); }
    else toast.error("Failed to generate forecast");
    setGenerating(false);
  }

  const months: ForecastMonth[] = forecast ? (() => {
    try { return JSON.parse(forecast.forecastJson).months ?? []; } catch { return []; }
  })() : [];

  const maxVal = months.length > 0 ? Math.max(...months.flatMap(m => [m.predictedIncome, m.predictedExpenses])) : 1;
  const barH = 120;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Flow Forecast</h1>
          <p className="text-muted-foreground mt-1">AI-powered 60-day cash flow prediction</p>
        </div>
        <Button onClick={generate} disabled={generating} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {forecast ? "Regenerate" : "Generate Forecast"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !forecast ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-4 opacity-20" />
            <p className="font-medium">No forecast yet</p>
            <p className="text-sm mt-1">Click Generate Forecast to get AI predictions based on your transaction history</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {forecast.narrative && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground leading-relaxed">{forecast.narrative}</p>
                <p className="text-xs text-muted-foreground mt-2">Generated {new Date(forecast.generatedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          )}

          {months.length > 0 && (
            <>
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-base">2-Month Projection</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-8 justify-center mb-6">
                    {months.map((m, i) => {
                      const incH = Math.round((m.predictedIncome / maxVal) * barH);
                      const expH = Math.round((m.predictedExpenses / maxVal) * barH);
                      return (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <svg width="80" height={barH + 10} viewBox={`0 0 80 ${barH + 10}`}>
                            <rect x="8" y={barH - incH} width="24" height={incH} fill="#10b981" rx="2" />
                            <rect x="48" y={barH - expH} width="24" height={expH} fill="#ef4444" rx="2" />
                          </svg>
                          <p className="text-xs font-medium">{MONTH_NAMES[m.month - 1]} {m.year}</p>
                        </div>
                      );
                    })}
                    <div className="flex flex-col justify-end gap-1 text-xs text-muted-foreground ml-4">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> Income</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500" /> Expenses</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-4 text-xs text-muted-foreground uppercase px-2">
                      <div className="col-span-2">Month</div>
                      <div className="text-right">Income</div>
                      <div className="text-right">Expenses</div>
                      <div className="text-right">Net</div>
                      <div className="text-right">Confidence</div>
                    </div>
                    {months.map((m, i) => (
                      <div key={i} className="grid grid-cols-6 gap-4 items-center py-2 border-b border-border/40 last:border-0 px-2 text-sm">
                        <div className="col-span-2 font-medium">{MONTH_NAMES[m.month - 1]} {m.year}</div>
                        <div className="text-right text-emerald-400">${m.predictedIncome.toLocaleString()}</div>
                        <div className="text-right text-red-400">${m.predictedExpenses.toLocaleString()}</div>
                        <div className={`text-right font-medium ${m.predictedNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {m.predictedNet >= 0 ? "+" : ""}${m.predictedNet.toLocaleString()}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={`text-xs ${m.confidence >= 0.8 ? "border-emerald-500/30 text-emerald-400" : "border-yellow-500/30 text-yellow-400"}`}>
                            {(m.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
