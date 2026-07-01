"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Brain, TrendingUp, TrendingDown, DollarSign, Users, FileText, Download } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";

interface Metrics {
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  invoiceCount: number;
  clientCount: number;
  burnRate: number;
  runway: number;
}

interface BoardReport {
  period: string;
  metrics: Metrics;
  narrative: string;
  generatedAt: string;
}

export default function BoardReportPage() {
  const { fmt } = useLocale();
  const [report, setReport] = useState<BoardReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function generateReport() {
    setGenerating(true);
    setReport(null);
    try {
      const res = await fetch("/api/ai/board-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReport(data);
      toast.success("Board report generated");
    } catch { toast.error("Failed to generate report"); }
    finally { setGenerating(false); }
  }

  function downloadReport() {
    if (!report) return;
    const text = `BOARD REPORT — ${report.period}\nGenerated: ${new Date(report.generatedAt).toLocaleString()}\n\n` +
      `FINANCIAL HIGHLIGHTS\n${"=".repeat(40)}\n` +
      `Revenue: ${fmt(report.metrics.revenue)}\n` +
      `Expenses: ${fmt(report.metrics.expenses)}\n` +
      `Net Income: ${fmt(report.metrics.netIncome)}\n` +
      `Cash Balance: ${fmt(report.metrics.cashBalance)}\n` +
      `Burn Rate: ${fmt(report.metrics.burnRate)}/mo\n` +
      `Runway: ${report.metrics.runway} months\n\n` +
      `EXECUTIVE NARRATIVE\n${"=".repeat(40)}\n${report.narrative}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-report-${report.period}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const metricCards = report ? [
    { label: "Revenue", value: fmt(report.metrics.revenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Expenses", value: fmt(report.metrics.expenses), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Net Income", value: fmt(report.metrics.netIncome), icon: DollarSign, color: report.metrics.netIncome >= 0 ? "text-emerald-600" : "text-red-600", bg: report.metrics.netIncome >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20" },
    { label: "Cash Balance", value: fmt(report.metrics.cashBalance), icon: DollarSign, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
    { label: "Active Clients", value: String(report.metrics.clientCount), icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Invoices Issued", value: String(report.metrics.invoiceCount), icon: FileText, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Burn Rate", value: `${fmt(report.metrics.burnRate)}/mo`, icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Runway", value: `${report.metrics.runway} months`, icon: TrendingUp, color: report.metrics.runway > 12 ? "text-emerald-600" : report.metrics.runway > 6 ? "text-amber-600" : "text-red-600", bg: "bg-muted" },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Board Report</h1>
          <p className="text-muted-foreground">Generate executive-ready board reports with AI narrative</p>
        </div>
        {report && (
          <Button variant="outline" onClick={downloadReport} className="gap-2">
            <Download className="h-4 w-4" />Download
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-1 flex-1 max-w-xs">
              <Label>Report Period</Label>
              <Input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              />
            </div>
            <Button onClick={generateReport} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generating && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI is analyzing your financial data...</p>
            <p className="text-xs text-muted-foreground mt-1">Compiling metrics, trends, and generating executive narrative</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Key Metrics — {new Date(report.period + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metricCards.map((card, i) => (
                <Card key={i} className={card.bg}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Executive Narrative
                <span className="text-xs font-normal text-muted-foreground ml-auto">Generated {new Date(report.generatedAt).toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {report.narrative.split("\n\n").map((paragraph, i) => {
                  if (paragraph.startsWith("##")) {
                    return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{paragraph.replace(/^##\s*/, "")}</h3>;
                  }
                  if (paragraph.startsWith("#")) {
                    return <h2 key={i} className="text-lg font-bold mt-6 mb-3">{paragraph.replace(/^#\s*/, "")}</h2>;
                  }
                  if (paragraph.startsWith("- ") || paragraph.startsWith("• ")) {
                    const items = paragraph.split("\n").filter(l => l.trim());
                    return (
                      <ul key={i} className="list-disc list-inside space-y-1 my-2">
                        {items.map((item, j) => (
                          <li key={j} className="text-sm text-muted-foreground">{item.replace(/^[-•]\s*/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{paragraph}</p>;
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!report && !generating && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No report generated yet</p>
            <p className="text-sm mt-1">Select a period and click "Generate Report" to create an AI-powered board report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
