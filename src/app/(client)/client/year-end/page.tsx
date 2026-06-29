import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Lock, CheckCircle2, Circle, MessageSquare } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default async function ClientYearEndPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");
  const userId = session.user.id;

   
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const yearStart = new Date(lastYear, 0, 1);
  const yearEnd = new Date(lastYear, 11, 31, 23, 59, 59);

  const [allTxns, reconciledCount, anomalies, lockedPeriods, monthlyReports, currentUser] = await Promise.all([
    prisma.transaction.count({ where: { userId, date: { gte: yearStart, lte: yearEnd } } }),
    prisma.transaction.count({ where: { userId, date: { gte: yearStart, lte: yearEnd }, reconciled: true } }),
    prisma.anomalyFlag.count({ where: { userId, dismissed: false } }),
    prisma.lockedPeriod.findMany({ where: { userId, year: lastYear }, select: { month: true } }),
    prisma.report.findMany({
      where: { userId, year: lastYear },
      select: { month: true, status: true, clientApprovedAt: true, totalIncome: true, totalExpenses: true, netProfit: true },
      orderBy: { month: "asc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
  ]);

  const currency = currentUser?.currency ?? "USD";
  const approvedReports = monthlyReports.filter((r) => r.clientApprovedAt).length;
  const allReportsApproved = approvedReports === 12;
  const allLocked = lockedPeriods.length === 12;
  const reconciledPct = allTxns > 0 ? (reconciledCount / allTxns) * 100 : 0;

  const totalRevenue = monthlyReports.reduce((s, r) => s + r.totalIncome, 0);
  const totalExpenses = monthlyReports.reduce((s, r) => s + r.totalExpenses, 0);
  const totalNet = monthlyReports.reduce((s, r) => s + r.netProfit, 0);

  const checklist = [
    { label: "All transactions in", done: allTxns > 0, detail: `${allTxns} transactions for ${lastYear}` },
    { label: "Reconciled with bank", done: reconciledPct >= 99, detail: `${reconciledPct.toFixed(0)}% matched` },
    { label: "Anomalies resolved", done: anomalies === 0, detail: anomalies === 0 ? "All clear" : `${anomalies} open flag${anomalies !== 1 ? "s" : ""}` },
    { label: "12 monthly reports delivered", done: monthlyReports.length === 12, detail: `${monthlyReports.length}/12 delivered` },
    { label: "12 monthly reports approved", done: allReportsApproved, detail: `${approvedReports}/12 signed off by you` },
    { label: "Year locked", done: allLocked, detail: allLocked ? "Period locked, books final" : "Awaiting accountant final lock" },
  ];

  const completed = checklist.filter((c) => c.done).length;
  const pct = (completed / checklist.length) * 100;

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> year_end / {lastYear}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{lastYear} year-end</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your firm wraps up the year. You sign off when ready. Books then lock for tax filing.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label={`${lastYear}_revenue`} value={fmt(totalRevenue)} color="text-emerald-400" />
        <Stat label={`${lastYear}_expenses`} value={fmt(totalExpenses)} color="text-rose-400" />
        <Stat label={`${lastYear}_net_profit`} value={fmt(totalNet)} color={totalNet >= 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex justify-between items-baseline mb-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">close_progress</p>
          <p className="font-mono text-sm font-semibold">{completed} / {checklist.length}</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {checklist.map((c, i) => {
          const Icon = c.done ? CheckCircle2 : Circle;
          return (
            <li
              key={i}
              className={`rounded-lg border p-4 flex items-start gap-3 ${
                c.done ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-border/60 bg-card/40"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${c.done ? "text-emerald-400" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {pct === 100 ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-5 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-foreground">{lastYear} books are closed ✓</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            Numbers final. Ready for tax filing. Talk to your accountant about next steps.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-5">
          <p className="font-semibold text-foreground">In progress</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your firm is wrapping up. You&apos;ll get a notification when it&apos;s ready for your sign-off.
            Questions in the meantime?
          </p>
          <Link href="/client/messages" className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-500 hover:text-emerald-400">
            <MessageSquare className="h-3.5 w-3.5" /> Message your accountant
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
