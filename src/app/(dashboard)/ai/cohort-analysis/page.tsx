"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";

interface CohortData {
  cohort: string;
  initialClients: number;
  initialMrr: number;
  retention: Record<string, number>;
  mrrRetention: Record<string, number>;
}

interface CohortResponse {
  cohorts: CohortData[];
  months: string[];
}

function getHeatmapColor(pct: number): string {
  if (pct >= 90) return "bg-emerald-600 text-white";
  if (pct >= 75) return "bg-emerald-500 text-white";
  if (pct >= 60) return "bg-emerald-400 text-white";
  if (pct >= 45) return "bg-amber-400 text-white";
  if (pct >= 30) return "bg-amber-500 text-white";
  if (pct >= 15) return "bg-orange-500 text-white";
  if (pct > 0) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
}

export default function CohortAnalysisPage() {
  const { fmt, locale } = useLocale();
  const [data, setData] = useState<CohortResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"clients" | "mrr">("mrr");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/cohort-analysis");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch { toast.error("Failed to load cohort data"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const formatMonth = (ym: string) => {
    try {
      return new Date(ym + "-01").toLocaleDateString(locale, { month: "short", year: "2-digit" });
    } catch { return ym; }
  };

  return (
    <div className="p-6 space-y-6 max-w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MRR Cohort Analysis</h1>
          <p className="text-muted-foreground">Revenue retention by client acquisition cohort</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setView("mrr")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "mrr" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              MRR
            </button>
            <button
              onClick={() => setView("clients")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${view === "clients" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Clients
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">Retention:</span>
        {[
          { label: "90%+", color: "bg-emerald-600" },
          { label: "75-90%", color: "bg-emerald-500" },
          { label: "60-75%", color: "bg-emerald-400" },
          { label: "45-60%", color: "bg-amber-400" },
          { label: "30-45%", color: "bg-amber-500" },
          { label: "15-30%", color: "bg-orange-500" },
          { label: "<15%", color: "bg-red-500" },
          { label: "N/A", color: "bg-muted border" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`h-3 w-3 rounded-sm ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data || data.cohorts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No cohort data available</p>
            <p className="text-sm mt-1">Cohort analysis requires invoice data from multiple months</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {view === "mrr" ? "MRR" : "Client"} Retention Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap border-b">Cohort</th>
                  <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap border-b">
                    {view === "mrr" ? "Initial MRR" : "Clients"}
                  </th>
                  {data.months.map((m, i) => (
                    <th key={m} className="p-1 font-medium text-muted-foreground whitespace-nowrap border-b min-w-[48px]">
                      M+{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort, i) => {
                  const retentionMap = view === "mrr" ? cohort.mrrRetention : cohort.retention;
                  return (
                    <tr key={cohort.cohort} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="p-2 font-medium whitespace-nowrap border-b border-muted">
                        {formatMonth(cohort.cohort)}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap border-b border-muted font-mono">
                        {view === "mrr" ? fmt(cohort.initialMrr) : cohort.initialClients}
                      </td>
                      {data.months.map((m) => {
                        const pct = retentionMap[m] !== undefined ? retentionMap[m] : -1;
                        if (pct < 0) {
                          return (
                            <td key={m} className="p-1 border-b border-muted">
                              <div className="h-8 w-12 rounded-sm bg-muted/50 flex items-center justify-center text-muted-foreground/30">
                                —
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={m} className="p-1 border-b border-muted">
                            <div
                              className={`h-8 w-12 rounded-sm flex items-center justify-center font-mono font-medium transition-colors ${getHeatmapColor(pct)}`}
                              title={`${cohort.cohort} at ${m}: ${pct.toFixed(1)}%`}
                            >
                              {pct === 100 ? "100" : pct.toFixed(0)}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.cohorts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cohorts</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{data.cohorts.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Initial MRR</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(data.cohorts.reduce((s, c) => s + c.initialMrr, 0))}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{data.cohorts.reduce((s, c) => s + c.initialClients, 0)}</p></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
