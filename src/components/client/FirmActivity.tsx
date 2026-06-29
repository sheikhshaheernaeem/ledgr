import { prisma } from "@/lib/db";
import { CheckCircle2, FileText, Sparkles, AlertTriangle, Clock, Activity } from "lucide-react";

interface ActivityItem {
  kind: "categorized" | "report_drafted" | "report_sent" | "anomaly" | "message" | "time";
  date: Date;
  title: string;
  detail: string;
}

const iconFor = {
  categorized: Sparkles,
  report_drafted: FileText,
  report_sent: CheckCircle2,
  anomaly: AlertTriangle,
  message: Clock,
  time: Clock,
};

const colorFor = {
  categorized: "text-emerald-400",
  report_drafted: "text-blue-400",
  report_sent: "text-emerald-400",
  anomaly: "text-amber-400",
  message: "text-blue-400",
  time: "text-muted-foreground",
};

const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

export async function FirmActivity({ userId }: { userId: string }) {
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentTxns, recentReports, recentAnomalies, recentMessages, timeEntries] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo }, status: "APPROVED", category: { not: null } },
      select: { id: true, description: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.report.findMany({
      where: { userId, OR: [{ draftedAt: { gte: sevenDaysAgo } }, { sentAt: { gte: sevenDaysAgo } }] },
      select: { id: true, month: true, year: true, draftedAt: true, sentAt: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.anomalyFlag.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { id: true, reason: true, severity: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.message.findMany({
      where: { userId, role: "ACCOUNTANT", createdAt: { gte: sevenDaysAgo } },
      select: { id: true, body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.firmTimeEntry.aggregate({
      where: { clientId: userId, startedAt: { gte: sevenDaysAgo }, durationSec: { not: null } },
      _sum: { durationSec: true },
      _count: true,
    }),
  ]);

  const items: ActivityItem[] = [];

  // Bundle categorizations by day for cleaner output
  const categorizedByDay = new Map<string, number>();
  for (const tx of recentTxns) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    categorizedByDay.set(key, (categorizedByDay.get(key) ?? 0) + 1);
  }
  for (const [day, count] of categorizedByDay.entries()) {
    items.push({
      kind: "categorized",
      date: new Date(day),
      title: `${count} transaction${count > 1 ? "s" : ""} categorized`,
      detail: count > 1 ? "AI + accountant review" : "Single transaction processed",
    });
  }

  for (const r of recentReports) {
    if (r.sentAt && r.sentAt >= sevenDaysAgo) {
      items.push({
        kind: "report_sent",
        date: r.sentAt,
        title: `${monthName(r.month, r.year)} report delivered`,
        detail: "Awaiting your review",
      });
    } else if (r.draftedAt && r.draftedAt >= sevenDaysAgo) {
      items.push({
        kind: "report_drafted",
        date: r.draftedAt,
        title: `${monthName(r.month, r.year)} report drafted`,
        detail: "Your accountant is reviewing",
      });
    }
  }

  for (const a of recentAnomalies) {
    items.push({
      kind: "anomaly",
      date: a.createdAt,
      title: `Flagged: ${a.reason.slice(0, 60)}`,
      detail: `${a.severity.toLowerCase()} severity · for your accountant to review`,
    });
  }

  for (const m of recentMessages) {
    items.push({
      kind: "message",
      date: m.createdAt,
      title: "New message from your accountant",
      detail: m.body.length > 80 ? m.body.slice(0, 80) + "…" : m.body,
    });
  }

  if (timeEntries._sum.durationSec && timeEntries._sum.durationSec > 0) {
    const hours = (timeEntries._sum.durationSec / 3600).toFixed(1);
    items.push({
      kind: "time",
       
      date: new Date(),
      title: `${hours}h of work logged this week`,
      detail: `${timeEntries._count} session${timeEntries._count !== 1 ? "s" : ""} across your books`,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const display = items.slice(0, 8);

  return (
    <section className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> firm_activity / last_7_days
        </p>
        <span className="font-mono text-[10px] text-muted-foreground">{items.length} event{items.length !== 1 ? "s" : ""}</span>
      </div>
      {display.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No firm activity in the last 7 days.
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {display.map((it, i) => {
            const Icon = iconFor[it.kind];
            return (
              <li key={i} className="px-4 py-2.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                  <Icon className={`h-3.5 w-3.5 ${colorFor[it.kind]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{it.detail}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-1">
                  {it.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
