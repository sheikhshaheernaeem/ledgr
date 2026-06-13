import { prisma } from "@/lib/db";
import { CheckCircle2, Circle, Clock, ArrowRight, Activity } from "lucide-react";

interface StepStatus {
  label: string;
  done: boolean;
  active: boolean;
  detail: string;
}

const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

export async function ServiceStatus({ userId }: { userId: string }) {
  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const closingMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
  const closingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const monthStart = new Date(closingYear, closingMonth - 1, 1);
  const monthEnd = new Date(closingYear, closingMonth, 0, 23, 59, 59);

  const [statements, monthTxns, monthReport, accountantLink] = await Promise.all([
    prisma.statement.findMany({
      where: { userId, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { id: true, status: true, rowCount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { id: true, category: true, status: true, reconciled: true },
    }),
    prisma.report.findFirst({
      where: { userId, month: closingMonth, year: closingYear },
      select: {
        id: true, status: true, draftedAt: true, accountantApprovedAt: true,
        sentAt: true, clientApprovedAt: true,
      },
    }),
    prisma.managedClient.findFirst({
      where: { clientId: userId, isActive: true },
      include: { accountant: { select: { name: true, email: true, companyName: true } } },
    }),
  ]);

  const hasData = statements.length > 0 || monthTxns.length > 0;
  const categorized = monthTxns.filter((t) => t.category && t.category !== "Uncategorized").length;
  const allCategorized = monthTxns.length > 0 && categorized === monthTxns.length;
  const drafted = !!monthReport?.draftedAt;
  const accountantApproved = !!monthReport?.accountantApprovedAt;
  const sentToClient = !!monthReport?.sentAt;
  const clientApproved = !!monthReport?.clientApprovedAt;

  const steps: StepStatus[] = [
    {
      label: "Your data is in",
      done: hasData,
      active: !hasData,
      detail: hasData ? `${statements.length} upload${statements.length !== 1 ? "s" : ""} · ${monthTxns.length} txns` : "Upload a CSV to get started",
    },
    {
      label: "AI categorized",
      done: allCategorized && monthTxns.length > 0,
      active: hasData && !allCategorized,
      detail: monthTxns.length > 0 ? `${categorized}/${monthTxns.length} classified` : "Waiting for data",
    },
    {
      label: "Accountant reviewing",
      done: accountantApproved,
      active: allCategorized && !accountantApproved,
      detail: accountantApproved ? "Approved" : drafted ? "Draft ready, awaiting review" : "Will start after categorization",
    },
    {
      label: "Report delivered",
      done: sentToClient,
      active: accountantApproved && !sentToClient,
      detail: sentToClient ? `Sent ${monthReport?.sentAt ? new Date(monthReport.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : "After accountant signs off",
    },
    {
      label: "You sign off",
      done: clientApproved,
      active: sentToClient && !clientApproved,
      detail: clientApproved ? `Approved ${monthReport?.clientApprovedAt ? new Date(monthReport.clientApprovedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : "Final approval",
    },
  ];

  const currentStep = steps.findIndex((s) => s.active);
  const completedCount = steps.filter((s) => s.done).length;
  const pct = (completedCount / steps.length) * 100;

  const closeDay = 5;
  const closeDate = new Date(now.getFullYear(), now.getMonth(), closeDay);
  const etaDays = Math.max(0, Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
      <div className="px-5 py-3 border-b border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> {monthName(closingMonth, closingYear)} close · {completedCount}/{steps.length}
          </p>
          {accountantLink?.accountant && (
            <p className="text-xs text-muted-foreground mt-0.5">
              with {accountantLink.accountant.companyName ?? accountantLink.accountant.name ?? "your accountant"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">eta</p>
          <p className="text-sm font-semibold text-foreground">
            {clientApproved ? "Done ✓" : etaDays === 0 ? "today" : `${etaDays} day${etaDays > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-5">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.done ? CheckCircle2 : s.active ? Clock : Circle;
            return (
              <li key={i} className="flex items-start gap-3">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${
                  s.done ? "text-emerald-400" :
                  s.active ? "text-amber-400 animate-pulse" :
                  "text-muted-foreground/40"
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${s.done || s.active ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{s.detail}</p>
                </div>
                {s.active && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/[0.08] text-amber-400 shrink-0 self-center">
                    now
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
