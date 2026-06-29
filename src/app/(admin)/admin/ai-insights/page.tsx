import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Brain, Zap, TrendingUp, AlertTriangle, FileText, Clock, ArrowLeft } from "lucide-react";

export default async function AiInsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  // ── Headline counts ──
  const sinceMonth = new Date();
  sinceMonth.setDate(sinceMonth.getDate() - 30);

  const [
    totalAnalyses, last30Analyses,
    finbertCount, heuristicCount,
    sentimentCounts,
    totalReports, totalAnomalies, totalCategorized, totalTransactions,
    avgLatency,
    recent,
  ] = await Promise.all([
    prisma.aiAnalysis.count(),
    prisma.aiAnalysis.count({ where: { createdAt: { gte: sinceMonth } } }),
    prisma.aiAnalysis.count({ where: { source: "finbert" } }),
    prisma.aiAnalysis.count({ where: { source: "heuristic" } }),
    prisma.aiAnalysis.groupBy({
      by: ["label"],
      _count: { _all: true },
      where: { label: { not: null } },
    }),
    prisma.report.count(),
    prisma.anomalyFlag.count().catch(() => 0),
    prisma.transaction.count({ where: { category: { not: null } } }).catch(() => 0),
    prisma.transaction.count().catch(() => 0),
    prisma.aiAnalysis.aggregate({ _avg: { latencyMs: true } }),
    prisma.aiAnalysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, kind: true, source: true, modelId: true,
        label: true, score: true, latencyMs: true, createdAt: true,
        user: { select: { email: true, companyName: true, name: true } },
      },
    }),
  ]);

  const sentimentMap: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const row of sentimentCounts) {
    if (row.label) sentimentMap[row.label] = row._count._all;
  }

  const classificationRate = totalTransactions > 0
    ? Math.round((totalCategorized / totalTransactions) * 100)
    : 0;
  const avgMs = avgLatency._avg.latencyMs ?? 0;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3 w-3" /> back_to_admin
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">AI insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance, accuracy, and usage across every model that runs inside Ledgr.
          </p>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Brain} label="Total analyses" value={totalAnalyses} sub={`${last30Analyses} last 30d`} accent="text-blue-500 dark:text-blue-400" />
        <Kpi icon={Zap} label="Classification rate" value={`${classificationRate}%`} sub={`${totalCategorized.toLocaleString()} of ${totalTransactions.toLocaleString()} txns`} accent="text-emerald-500 dark:text-emerald-400" />
        <Kpi icon={AlertTriangle} label="Anomalies flagged" value={totalAnomalies} sub="all-time" accent="text-amber-500 dark:text-amber-400" />
        <Kpi icon={FileText} label="Reports generated" value={totalReports} sub="all-time" accent="text-foreground" />
      </div>

      {/* Models in use */}
      <section className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">models · in_use</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
          <ModelCard
            name="Llama 3.3 70B"
            host="Groq"
            purpose="AI accountant chat, narrative summaries, monthly P&amp;L explainers"
            calls={totalReports}
            badge="primary"
          />
          <ModelCard
            name="FinBERT (yiyanghkust/finbert-tone)"
            host="Hugging Face"
            purpose="Financial statement sentiment classification (positive / neutral / negative)"
            calls={finbertCount}
            extra={`${heuristicCount} heuristic fallback calls`}
            badge="sentiment"
          />
          <ModelCard
            name="Gemini"
            host="Google AI"
            purpose="Transaction categorization, vendor extraction"
            calls={totalCategorized}
            badge="categorization"
          />
        </div>
      </section>

      {/* FinBERT-specific distribution */}
      <section className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
            <Brain className="h-3 w-3" /> finbert · sentiment_distribution
          </p>
          <p className="font-mono text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> avg latency {Math.round(avgMs)}ms
          </p>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          <Distribution label="Positive" value={sentimentMap.positive} color="bg-emerald-500" />
          <Distribution label="Neutral" value={sentimentMap.neutral} color="bg-blue-500" />
          <Distribution label="Negative" value={sentimentMap.negative} color="bg-rose-500" />
        </div>
      </section>

      {/* Recent runs */}
      <section className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">recent · ai_runs</p>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No AI runs yet. Once clients use FinBERT / categorization, runs appear here.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {recent.map((r) => (
              <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-card/60">
                <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground">
                  {r.source}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{r.modelId}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {r.user.companyName ?? r.user.name ?? r.user.email}
                  </p>
                </div>
                {r.label && (
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${
                    r.label === "positive" ? "text-emerald-400" :
                    r.label === "negative" ? "text-rose-400" :
                    "text-blue-400"
                  }`}>
                    {r.label} {r.score ? `${Math.round(r.score * 100)}%` : ""}
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {r.latencyMs}ms
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {timeAgo(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground text-center font-mono">
        <TrendingUp className="h-3 w-3 inline mr-1" />
        ai_lifts_heavy · humans_ensure_accuracy
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, sub, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function ModelCard({
  name, host, purpose, calls, extra, badge,
}: { name: string; host: string; purpose: string; calls: number; extra?: string; badge: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground">
          {badge}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">{host}</span>
      </div>
      <p className="font-semibold text-foreground text-sm">{name}</p>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: purpose }} />
      <p className="text-2xl font-bold tracking-tight mt-3 text-foreground">{calls.toLocaleString()}</p>
      <p className="font-mono text-[10px] text-muted-foreground">calls_all_time</p>
      {extra && <p className="font-mono text-[10px] text-muted-foreground mt-1">{extra}</p>}
    </div>
  );
}

function Distribution({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
      <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`} />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function timeAgo(d: Date): string {
   
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
