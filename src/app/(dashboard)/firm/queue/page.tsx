import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Inbox, FileText, AlertTriangle, MessageSquare, Upload, Clock, ArrowRight,
  CheckCircle2,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

interface QueueItem {
  kind: "report" | "anomaly" | "message" | "upload_error";
  href: string;
  clientName: string;
  clientId: string;
  title: string;
  detail: string;
  age: string;
  severity: "high" | "med" | "low";
}

const severityStyle = {
  high: "border-rose-500/30 bg-rose-500/[0.05]",
  med: "border-amber-500/30 bg-amber-500/[0.05]",
  low: "border-border bg-card/40",
};
const severityChip = {
  high: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  med: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  low: "border-border bg-card/60 text-muted-foreground",
};

function ageOf(d: Date): { label: string; severity: "high" | "med" | "low" } {
  const hrs = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  if (hrs < 24) return { label: `${Math.round(hrs)}h ago`, severity: "low" };
  const days = Math.round(hrs / 24);
  if (days <= 3) return { label: `${days}d ago`, severity: "med" };
  return { label: `${days}d ago`, severity: "high" };
}

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") redirect("/client");
  const userId = session.user.id as string;
  const isAdmin = role === "ADMIN";
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find clients this operator can act on
  const clientIds = isAdmin
    ? (await prisma.user.findMany({ where: { role: "CLIENT" }, select: { id: true } })).map((u) => u.id)
    : (await prisma.managedClient.findMany({ where: { accountantId: userId, isActive: true }, select: { clientId: true } })).map((mc) => mc.clientId);

  const clientMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const clients = await prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, email: true, companyName: true },
    });
    for (const c of clients) clientMap.set(c.id, c.companyName ?? c.name ?? c.email);
  }

  // ── fetch the 4 streams in parallel ──
  const [draftReports, anomalies, unreadMessages, failedStatements, last30Stats] = await Promise.all([
    // 1. Draft reports awaiting accountant approval
    prisma.report.findMany({
      where: {
        userId: { in: clientIds },
        OR: [
          { status: "DRAFT" },
          { AND: [{ draftedAt: { not: null } }, { accountantApprovedAt: null }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, userId: true, month: true, year: true,
        totalIncome: true, totalExpenses: true, netProfit: true,
        createdAt: true, draftedAt: true,
      },
    }),
    // 2. Open anomaly flags
    prisma.anomalyFlag.findMany({
      where: { userId: { in: clientIds }, dismissed: false },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true, userId: true, reason: true, severity: true, createdAt: true, transactionId: true,
      },
    }),
    // 3. Unread client messages (role=CLIENT, readAt=null)
    prisma.message.findMany({
      where: { userId: { in: clientIds }, role: "CLIENT", readAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, userId: true, body: true, createdAt: true,
      },
    }),
    // 4. Failed CSV uploads
    prisma.statement.findMany({
      where: { userId: { in: clientIds }, status: "ERROR" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, userId: true, filename: true, errorMsg: true, createdAt: true,
      },
    }),
    // ── stats for the strip ──
    Promise.all([
      prisma.report.count({ where: { userId: { in: clientIds }, clientApprovedAt: { not: null }, sentAt: { gte: thirtyDaysAgo } } }),
      prisma.statement.count({ where: { userId: { in: clientIds }, createdAt: { gte: thirtyDaysAgo } } }),
    ]),
  ]);

  // ── build unified queue ──
  const items: QueueItem[] = [];

  for (const r of draftReports) {
    const age = ageOf(r.draftedAt ?? r.createdAt);
    items.push({
      kind: "report",
      href: `/firm/${r.userId}?tab=reports`,
      clientId: r.userId,
      clientName: clientMap.get(r.userId) ?? "Unknown",
      title: `${monthName(r.month, r.year)} report awaiting approval`,
      detail: `Revenue ${fmt(r.totalIncome)} · Expenses ${fmt(r.totalExpenses)} · Net ${fmt(r.netProfit)}`,
      age: age.label,
      severity: age.severity,
    });
  }

  for (const a of anomalies) {
    const age = ageOf(a.createdAt);
    items.push({
      kind: "anomaly",
      href: `/firm/${a.userId}?tab=anomalies`,
      clientId: a.userId,
      clientName: clientMap.get(a.userId) ?? "Unknown",
      title: `Anomaly · ${a.severity.toLowerCase()}`,
      detail: a.reason,
      age: age.label,
      severity: a.severity === "HIGH" || a.severity === "CRITICAL" ? "high" : a.severity === "MEDIUM" ? "med" : "low",
    });
  }

  for (const m of unreadMessages) {
    const age = ageOf(m.createdAt);
    items.push({
      kind: "message",
      href: `/firm/${m.userId}?tab=notes`,
      clientId: m.userId,
      clientName: clientMap.get(m.userId) ?? "Unknown",
      title: "New client message",
      detail: m.body.length > 120 ? m.body.slice(0, 120) + "…" : m.body,
      age: age.label,
      severity: age.severity,
    });
  }

  for (const s of failedStatements) {
    const age = ageOf(s.createdAt);
    items.push({
      kind: "upload_error",
      href: `/firm/${s.userId}?tab=statements`,
      clientId: s.userId,
      clientName: clientMap.get(s.userId) ?? "Unknown",
      title: `Upload failed: ${s.filename}`,
      detail: s.errorMsg ?? "Parse error — needs manual review",
      age: age.label,
      severity: "high",
    });
  }

  // Group by client for the dense view
  const groupedByClient = new Map<string, QueueItem[]>();
  for (const it of items) {
    const arr = groupedByClient.get(it.clientId) ?? [];
    arr.push(it);
    groupedByClient.set(it.clientId, arr);
  }

  // Sort: severity > age (already roughly sorted by age within sections)
  const sevRank = { high: 0, med: 1, low: 2 } as const;
  items.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Inbox className="h-3 w-3" /> firm / queue
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Your queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything that needs your attention across {clientIds.length} client{clientIds.length !== 1 ? "s" : ""} — in one place.
        </p>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="awaiting_approval" value={draftReports.length.toString()} icon={FileText} color={draftReports.length > 0 ? "text-amber-400" : "text-foreground"} />
        <Stat label="anomalies" value={anomalies.length.toString()} icon={AlertTriangle} color={anomalies.length > 5 ? "text-rose-400" : anomalies.length > 0 ? "text-amber-400" : "text-foreground"} />
        <Stat label="unread_messages" value={unreadMessages.length.toString()} icon={MessageSquare} color={unreadMessages.length > 0 ? "text-amber-400" : "text-foreground"} />
        <Stat label="failed_uploads" value={failedStatements.length.toString()} icon={Upload} color={failedStatements.length > 0 ? "text-rose-400" : "text-foreground"} />
        <Stat label="reports_delivered_30d" value={last30Stats[0].toString()} icon={CheckCircle2} color="text-emerald-400" />
      </div>

      {/* items */}
      {items.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-12 w-12 text-emerald-400/60 mx-auto mb-4" />
          <p className="font-medium text-foreground">Inbox zero ✓</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            No reports to approve, no anomalies to review, no unread messages, no failed uploads.
            All caught up across your {clientIds.length} client{clientIds.length !== 1 ? "s" : ""}.
          </p>
          <div className="mt-6">
            <Link href="/firm">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400">
                View all clients <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Link
              key={`${it.kind}-${i}`}
              href={it.href}
              className={`block rounded-lg border p-4 transition-colors hover:bg-card/60 ${severityStyle[it.severity]}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                  {it.kind === "report" && <FileText className="h-4 w-4 text-amber-400" />}
                  {it.kind === "anomaly" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  {it.kind === "message" && <MessageSquare className="h-4 w-4 text-blue-400" />}
                  {it.kind === "upload_error" && <Upload className="h-4 w-4 text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{it.clientName}</p>
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityChip[it.severity]}`}>
                      {it.kind.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" /> {it.age}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.detail}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 mt-3 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, color = "text-foreground" }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
