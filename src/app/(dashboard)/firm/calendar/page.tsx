import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Calendar, FileText, Receipt, Lock, AlertTriangle, CheckCircle2, CheckSquare,
} from "lucide-react";

interface CalEvent {
  date: Date;
  kind: "tax" | "monthly_close" | "task" | "report_due";
  title: string;
  detail: string;
  href: string;
  clientName?: string;
  severity: "high" | "med" | "low" | "done";
}

const severityChip = {
  high: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  med: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  low: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

const monthName = (m: number, y: number) =>
  new Date(y, m).toLocaleString("en-US", { month: "long", year: "numeric" });

export default async function FirmCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") redirect("/client");
  const userId = session.user.id as string;
  const isAdmin = role === "ADMIN";

   
  const now = new Date();
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

  // Pull tax events + open tasks
  const [taxEvents, tasks] = await Promise.all([
    prisma.taxCalendarEvent.findMany({
      where: { userId: { in: clientIds } },
      orderBy: { dueDate: "asc" },
      select: { id: true, userId: true, title: true, dueDate: true, status: true, type: true, notes: true },
    }),
    prisma.firmTask.findMany({
      where: { ownerId: userId, status: { not: "DONE" }, dueAt: { not: null } },
      orderBy: { dueAt: "asc" },
      select: { id: true, title: true, dueAt: true, clientId: true, priority: true, status: true },
    }),
  ]);

  const events: CalEvent[] = [];

  for (const t of taxEvents) {
    const overdue = t.dueDate < now;
    const isDone = t.status === "DONE" || t.status === "COMPLETE" || t.status === "FILED";
    events.push({
      date: t.dueDate,
      kind: "tax",
      title: t.title + (t.type ? ` · ${t.type}` : ""),
      detail: t.notes ?? "Tax filing deadline",
      href: `/firm/${t.userId}?tab=overview`,
      clientName: clientMap.get(t.userId),
      severity: isDone ? "done" : overdue ? "high" : "med",
    });
  }

  for (const t of tasks) {
    if (!t.dueAt) continue;
    const overdue = t.dueAt < now;
    events.push({
      date: t.dueAt,
      kind: "task",
      title: t.title,
      detail: `Task · ${t.priority.toLowerCase()} priority`,
      href: `/firm/tasks`,
      clientName: t.clientId ? clientMap.get(t.clientId) : undefined,
      severity: overdue ? "high" : t.priority === "HIGH" ? "high" : t.priority === "MED" ? "med" : "low",
    });
  }

  // Auto-generate monthly close deadlines for current & next month (5th of each month — service promise)
  for (const cid of clientIds) {
    const thisClose = new Date(now.getFullYear(), now.getMonth(), 5);
    const nextClose = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    if (thisClose >= now) {
      events.push({
        date: thisClose,
        kind: "monthly_close",
        title: `${monthName(now.getMonth() - 1, now.getFullYear())} close`,
        detail: "Deliver reviewed P&L to client",
        href: `/firm/${cid}?tab=reports`,
        clientName: clientMap.get(cid),
        severity: "med",
      });
    }
    events.push({
      date: nextClose,
      kind: "monthly_close",
      title: `${monthName(now.getMonth(), now.getFullYear())} close`,
      detail: "Deliver reviewed P&L to client",
      href: `/firm/${cid}?tab=reports`,
      clientName: clientMap.get(cid),
      severity: "low",
    });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by month + day
  const byBucket = new Map<string, CalEvent[]>();
  for (const e of events) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
    byBucket.set(key, [...(byBucket.get(key) ?? []), e]);
  }
  const monthKeys = Array.from(byBucket.keys()).sort();

  const overdueCount = events.filter((e) => e.severity === "high" && e.date < now).length;
  const thisWeekCount = events.filter((e) => e.date >= now && e.date < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).length;
  const this30dCount = events.filter((e) => e.date >= now && e.date < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> firm / calendar
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Deadlines &amp; events</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tax filings · monthly closes · tasks · year-end. Across all {clientIds.length} client{clientIds.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="overdue" value={overdueCount.toString()} color={overdueCount > 0 ? "text-rose-400" : "text-foreground"} icon={AlertTriangle} />
        <Stat label="this_week" value={thisWeekCount.toString()} color="text-amber-400" icon={Calendar} />
        <Stat label="next_30d" value={this30dCount.toString()} icon={Calendar} />
        <Stat label="total_events" value={events.length.toString()} color="text-foreground" icon={CheckSquare} />
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-12 w-12 text-emerald-400/60 mx-auto mb-3" />
          <p className="font-medium text-foreground">No deadlines</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add tasks with due dates or set up tax calendar events on a client&apos;s workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {monthKeys.map((key) => {
            const [y, m] = key.split("-").map((s) => parseInt(s, 10));
            const monthEvents = byBucket.get(key) ?? [];
            return (
              <section key={key}>
                <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
                  {new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" })} · {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                </h2>
                <ul className="space-y-2">
                  {monthEvents.map((e, i) => {
                    const Icon =
                      e.kind === "tax" ? Receipt :
                      e.kind === "monthly_close" ? Lock :
                      e.kind === "report_due" ? FileText :
                      CheckSquare;
                    return (
                      <li key={`${e.kind}-${i}`}>
                        <Link
                          href={e.href}
                          className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 hover:bg-card/60 transition-colors"
                        >
                          <div className="w-12 text-center shrink-0">
                            <p className="font-mono text-[10px] uppercase text-muted-foreground">
                              {e.date.toLocaleString("en-US", { month: "short" })}
                            </p>
                            <p className="text-xl font-bold text-foreground leading-none">
                              {e.date.getDate()}
                            </p>
                          </div>
                          <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{e.title}</p>
                              <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityChip[e.severity]}`}>
                                {e.kind.replace(/_/g, " ")}
                              </span>
                              {e.clientName && (
                                <span className="font-mono text-[10px] text-muted-foreground">↳ {e.clientName}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-foreground", icon: Icon }: {
  label: string; value: string; color?: string; icon: React.ComponentType<{ className?: string }>;
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
