import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  CheckCircle2, FileText, FileCheck, MessageSquare, PackageCheck, Upload,
  ArrowRight, Sparkles,
} from "lucide-react";

interface Action {
  id: string;
  kind: "approve_report" | "drl" | "deliverable" | "messages" | "upload_reminder";
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  sub: string;
  href: string;
  cta: string;
  meta?: string;
}

const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

export async function ActionInbox({ userId }: { userId: string }) {
   
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [pendingReports, openDRLs, unacknowledgedDeliverables, unreadMessages, lastUpload] = await Promise.all([
    // Reports SENT but not yet clientApproved
    prisma.report.findMany({
      where: { userId, sentAt: { not: null }, clientApprovedAt: null },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true, month: true, year: true, clientApprovalToken: true },
      take: 5,
    }),
    // Document requests with pending items
    prisma.documentRequest.findMany({
      where: { clientId: userId, status: { in: ["OPEN", "PARTIAL"] } },
      select: { id: true, title: true, itemsJson: true },
      take: 5,
    }),
    // Service requests recently completed but not acknowledged
    prisma.clientServiceRequest.findMany({
      where: {
        clientId: userId,
        status: "COMPLETED",
        clientAcknowledgedAt: null,
        completedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { completedAt: "desc" },
      select: { id: true, title: true, deliverableType: true },
      take: 5,
    }),
    prisma.message.count({
      where: { userId, role: "ACCOUNTANT", readAt: null },
    }),
    prisma.statement.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const actions: Action[] = [];

  // 1. Reports to approve (most urgent)
  for (const r of pendingReports) {
    actions.push({
      id: `r-${r.id}`,
      kind: "approve_report",
      icon: CheckCircle2,
      iconColor: "text-amber-400",
      title: `Approve ${monthName(r.month, r.year)} report`,
      sub: "Review the P&L and sign off",
      meta: "2 min",
      href: r.clientApprovalToken ? `/p/report/${r.clientApprovalToken}` : "/client/reports",
      cta: "Review",
    });
  }

  // 2. DRL pending items
  for (const drl of openDRLs) {
    let pending = 0;
    let total = 0;
    try {
      const items = JSON.parse(drl.itemsJson) as Array<{ status: string }>;
      total = items.length;
      pending = items.filter((i) => i.status === "pending").length;
    } catch {}
    if (pending === 0) continue;
    actions.push({
      id: `d-${drl.id}`,
      kind: "drl",
      icon: FileCheck,
      iconColor: "text-cyan-400",
      title: drl.title,
      sub: `Upload ${pending} document${pending > 1 ? "s" : ""} requested by your firm`,
      meta: `${total - pending} of ${total} done`,
      href: "/client/requests",
      cta: "Upload",
    });
  }

  // 3. Deliverables to acknowledge
  for (const d of unacknowledgedDeliverables) {
    actions.push({
      id: `del-${d.id}`,
      kind: "deliverable",
      icon: PackageCheck,
      iconColor: "text-emerald-400",
      title: `New: ${d.title}`,
      sub: `Your firm completed and delivered ${d.deliverableType?.replace(/_/g, " ") ?? "your request"}`,
      meta: "ready",
      href: "/client/requests",
      cta: "View",
    });
  }

  // 4. Unread messages
  if (unreadMessages > 0) {
    actions.push({
      id: "msg",
      kind: "messages",
      icon: MessageSquare,
      iconColor: "text-cyan-400",
      title: `${unreadMessages} new message${unreadMessages > 1 ? "s" : ""}`,
      sub: "From your accountant",
      href: "/client/messages",
      cta: "Read",
    });
  }

  // 5. Upload reminder if no recent activity
  const daysSinceLastUpload = lastUpload?.createdAt
    ? Math.floor((now.getTime() - lastUpload.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  if (!lastUpload) {
    actions.push({
      id: "upload-first",
      kind: "upload_reminder",
      icon: Upload,
      iconColor: "text-emerald-400",
      title: "Upload your first bank statement",
      sub: "We can't start your books without it",
      href: "/client/upload",
      cta: "Upload",
    });
  } else if (daysSinceLastUpload !== null && daysSinceLastUpload > 35) {
    actions.push({
      id: "upload-stale",
      kind: "upload_reminder",
      icon: Upload,
      iconColor: "text-amber-400",
      title: "Send this month's statement",
      sub: `Last upload was ${daysSinceLastUpload} days ago`,
      href: "/client/upload",
      cta: "Upload",
    });
  }

  if (actions.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 text-center">
        <Sparkles className="h-10 w-10 text-emerald-400/70 mx-auto mb-3" />
        <p className="font-semibold text-foreground">All clear</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          Nothing needs your attention. Your firm is on it.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          {actions.length} {actions.length === 1 ? "thing needs" : "things need"} you
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">priority_order</p>
      </div>
      <ul className="space-y-2">
        {actions.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="group block rounded-xl border border-border/60 bg-card/40 hover:border-emerald-500/40 hover:bg-card/60 transition-all p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
                  <a.icon className={`h-5 w-5 ${a.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground">{a.sub}</p>
                    {a.meta && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 ml-auto sm:ml-2">
                        · {a.meta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-emerald-500 group-hover:text-emerald-400 shrink-0">
                  {a.cta} <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <ArrowRight className="sm:hidden h-4 w-4 text-muted-foreground group-hover:text-emerald-400 shrink-0" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
