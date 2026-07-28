import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, Users, DollarSign, AlertTriangle, ArrowLeft,
  Activity, BarChart3, FileText, Upload,
} from "lucide-react";

const PLAN_PRICE: Record<string, number> = {
  STARTER: 299,
  GROWTH: 599,
  CFO: 1499,
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function priceForPlan(plan: string | null | undefined): number {
  if (!plan) return PLAN_PRICE.STARTER;
  return PLAN_PRICE[plan.toUpperCase()] ?? PLAN_PRICE.STARTER;
}

export default async function AdminMetricsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    clients,
    activeSubs,
    canceledSubs,
    canceledLast30,
    newClientsLast30,
    reportsThisMonth,
    statementsLast7,
    totalTransactions,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      include: { subscriptions: true, _count: { select: { transactions: true, statements: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany({ where: { status: { not: "ACTIVE" } } }),
    prisma.subscription.findMany({
      where: { status: { not: "ACTIVE" }, expiresAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT", createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, createdAt: true },
    }),
    prisma.report.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { id: true, status: true, sentAt: true, clientApprovedAt: true, accountantApprovedAt: true },
    }),
    prisma.statement.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, userId: true, status: true },
    }),
    prisma.transaction.count(),
  ]);

  // MRR by tier
  const subsByTier: Record<string, number> = { STARTER: 0, GROWTH: 0, CFO: 0 };
  let mrr = 0;
  for (const s of activeSubs) {
    const plan = (s.plan ?? "STARTER").toUpperCase();
    subsByTier[plan] = (subsByTier[plan] ?? 0) + 1;
    mrr += priceForPlan(plan);
  }

  const activeCount = activeSubs.length;
  const totalCount = activeCount + canceledSubs.length;
  const churnRate30 = totalCount > 0 ? (canceledLast30.length / totalCount) * 100 : 0;
  const arpu = activeCount > 0 ? mrr / activeCount : 0;

  // Activation: % of new clients (last 30d) who uploaded a statement within 7d of signup
  let activated = 0;
  for (const c of newClientsLast30) {
    const cutoff = new Date(c.createdAt); cutoff.setDate(cutoff.getDate() + 7);
    const stmt = await prisma.statement.findFirst({
      where: { userId: c.id, createdAt: { lte: cutoff } },
      select: { id: true },
    });
    if (stmt) activated++;
  }
  const activationRate = newClientsLast30.length > 0 ? (activated / newClientsLast30.length) * 100 : 0;

  // Reports stats
  const reportsCreated = reportsThisMonth.length;
  const reportsSent = reportsThisMonth.filter((r) => r.sentAt).length;
  const reportsApprovedByClient = reportsThisMonth.filter((r) => r.clientApprovedAt).length;
  const reportsPendingAccountant = reportsThisMonth.filter((r) => r.status === "DRAFT" && !r.accountantApprovedAt).length;

  // Top clients by upload activity (last 7 days)
  const activityByClient = new Map<string, number>();
  for (const s of statementsLast7) {
    activityByClient.set(s.userId, (activityByClient.get(s.userId) ?? 0) + 1);
  }

  // 30-day vs 60-day comparison for trend
  const prevMrrWindow = canceledSubs.filter((s) => s.expiresAt && s.expiresAt >= sixtyDaysAgo && s.expiresAt < thirtyDaysAgo).length;
  const churnTrend = canceledLast30.length - prevMrrWindow;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
          <ArrowLeft className="h-3 w-3" /> admin / metrics
        </Link>

        <div className="border-b border-border/60 pb-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> business_metrics
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">MRR &amp; Growth</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Numbers YC will ask about. Updated live from Stripe subscription state and client activity.
          </p>
        </div>

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
          <Kpi label="mrr" value={fmt(mrr)} icon={DollarSign} color="text-emerald-400" sub={`${activeCount} active accounts`} />
          <Kpi label="arpu" value={fmt(arpu)} icon={Users} sub="avg revenue per account" />
          <Kpi
            label="churn_30d"
            value={`${fmtDec(churnRate30)}%`}
            icon={AlertTriangle}
            color={churnRate30 < 5 ? "text-emerald-400" : churnRate30 < 10 ? "text-amber-400" : "text-rose-400"}
            sub={`${canceledLast30.length} canceled · ${churnTrend >= 0 ? "+" : ""}${churnTrend} vs prev 30d`}
          />
          <Kpi
            label="activation_30d"
            value={`${fmtDec(activationRate)}%`}
            icon={TrendingUp}
            color={activationRate > 60 ? "text-emerald-400" : activationRate > 40 ? "text-amber-400" : "text-rose-400"}
            sub={`${activated} of ${newClientsLast30.length} new clients uploaded in 7d`}
          />
        </div>

        {/* MRR breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">mrr_by_tier</p>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(PLAN_PRICE).map(([plan, price]) => {
                const count = subsByTier[plan] ?? 0;
                const tierMrr = count * price;
                const pct = mrr > 0 ? (tierMrr / mrr) * 100 : 0;
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="font-mono text-xs">
                        <span className="text-foreground">{plan.toLowerCase()}</span>
                        <span className="text-muted-foreground"> · ${price}/mo · {count} account{count !== 1 ? "s" : ""}</span>
                      </span>
                      <span className="font-mono font-semibold text-emerald-400">{fmt(tierMrr)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-border/60 flex justify-between text-sm">
                <span className="font-mono text-muted-foreground">arr_estimated</span>
                <span className="font-mono font-bold text-emerald-400">{fmt(mrr * 12)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">acquisition_30d</p>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">new_clients</span>
                <span className="font-mono text-foreground">{newClientsLast30.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">activated_within_7d</span>
                <span className="font-mono text-foreground">{activated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">churned_in_period</span>
                <span className="font-mono text-foreground">{canceledLast30.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">net_new</span>
                <span className={`font-mono font-semibold ${newClientsLast30.length - canceledLast30.length >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {newClientsLast30.length - canceledLast30.length >= 0 ? "+" : ""}{newClientsLast30.length - canceledLast30.length}
                </span>
              </div>
              <div className="pt-3 border-t border-border/60 flex justify-between">
                <span className="text-muted-foreground">net_mrr_change_30d</span>
                <span className={`font-mono font-semibold ${(newClientsLast30.length - canceledLast30.length) * arpu >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(newClientsLast30.length - canceledLast30.length) >= 0 ? "+" : ""}{fmt((newClientsLast30.length - canceledLast30.length) * arpu)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
          <Kpi label="reports_this_month" value={reportsCreated.toString()} icon={FileText} sub={`${reportsSent} sent to clients`} />
          <Kpi label="awaiting_accountant" value={reportsPendingAccountant.toString()} icon={Activity} color={reportsPendingAccountant > 5 ? "text-amber-400" : "text-foreground"} sub="DRAFT reports" />
          <Kpi label="client_approved" value={reportsApprovedByClient.toString()} icon={BarChart3} color="text-emerald-400" sub="this month" />
          <Kpi label="total_txns_processed" value={totalTransactions.toLocaleString()} icon={Upload} sub="all time" />
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">client_roster</p>
            <span className="font-mono text-[10px] text-muted-foreground">{clients.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card/60 border-b border-border/60 text-left">
                <tr>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">name</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">plan</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">mrr</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">status</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider text-right">txns</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider text-right">activity_7d</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {clients.slice(0, 25).map((c) => {
                  const plan = c.subscriptions?.[0]?.plan?.toUpperCase() ?? "STARTER";
                  const subStatus = c.subscriptions?.[0]?.status ?? "INACTIVE";
                  const active = subStatus === "ACTIVE";
                  const activity = activityByClient.get(c.id) ?? 0;
                  return (
                    <tr key={c.id} className="hover:bg-card/30">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{c.companyName ?? c.name ?? c.email}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.email}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground uppercase">{plan}</td>
                      <td className="px-3 py-2 font-mono text-sm text-emerald-400">{active ? fmt(priceForPlan(plan)) : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                          active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground"
                        }`}>
                          {subStatus.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{c._count.transactions}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {activity > 0 ? <span className="text-emerald-400">{activity} upload{activity > 1 ? "s" : ""}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/30 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">notes_for_yc_application</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>MRR is computed from active subscription tier × plan price.</li>
            <li>Activation = client who uploaded a CSV within 7 days of signup. Industry target: 60%+.</li>
            <li>Churn = subscriptions that left ACTIVE state in last 30 days / total customers.</li>
            <li>Net MRR change ≈ (new − churned) × ARPU. Better metric: track per-account ARR delta over time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label, value, icon: Icon, color = "text-foreground", sub,
}: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
  color?: string; sub?: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
