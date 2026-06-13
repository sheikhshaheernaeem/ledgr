import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TrendingUp, Clock, DollarSign, Users, ExternalLink } from "lucide-react";

const PLAN_PRICE: Record<string, number> = { STARTER: 299, GROWTH: 599, CFO: 1499 };

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function FirmRevenuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/firm/queue");

  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [operators, allClients, timeEntries, allSubs] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ACCOUNTANT", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      include: {
        subscription: true,
        managedByAccounts: { where: { isActive: true }, select: { accountantId: true } },
      },
    }),
    prisma.firmTimeEntry.findMany({
      where: { startedAt: { gte: thirtyDaysAgo }, durationSec: { not: null } },
      select: { operatorId: true, clientId: true, durationSec: true, billable: true, billableRate: true },
    }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
  ]);

  // Total firm MRR
  let totalMrr = 0;
  for (const s of allSubs) totalMrr += PLAN_PRICE[(s.plan ?? "STARTER").toUpperCase()] ?? PLAN_PRICE.STARTER;

  // Total time + billable
  const totalSec = timeEntries.reduce((s, e) => s + (e.durationSec ?? 0), 0);
  const billableSec = timeEntries.filter((e) => e.billable).reduce((s, e) => s + (e.durationSec ?? 0), 0);
  const realizationRate = totalSec > 0 ? (billableSec / totalSec) * 100 : 0;

  // Per-operator stats
  const opStats = operators.map((op) => {
    const opClients = allClients.filter((c) => c.managedByAccounts.some((m) => m.accountantId === op.id));
    const opMrr = opClients.reduce((s, c) => s + (PLAN_PRICE[(c.subscription?.plan ?? "STARTER").toUpperCase()] ?? PLAN_PRICE.STARTER), 0);
    const opEntries = timeEntries.filter((e) => e.operatorId === op.id);
    const opSec = opEntries.reduce((s, e) => s + (e.durationSec ?? 0), 0);
    const opBillableSec = opEntries.filter((e) => e.billable).reduce((s, e) => s + (e.durationSec ?? 0), 0);
    const opRevenuePerHour = opSec > 0 ? opMrr / (opSec / 3600) : 0;
    return {
      id: op.id,
      name: op.name ?? op.email,
      role: op.role,
      clients: opClients.length,
      mrr: opMrr,
      hours: opSec / 3600,
      billableHours: opBillableSec / 3600,
      revenuePerHour: opRevenuePerHour,
    };
  });

  // Top clients by MRR
  const topClients = allClients
    .map((c) => ({
      id: c.id,
      name: c.companyName ?? c.name ?? c.email,
      mrr: PLAN_PRICE[(c.subscription?.plan ?? "STARTER").toUpperCase()] ?? PLAN_PRICE.STARTER,
      plan: (c.subscription?.plan ?? "STARTER").toUpperCase(),
      status: c.subscription?.status ?? "ACTIVE",
    }))
    .filter((c) => c.status === "ACTIVE")
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" /> firm / revenue
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Firm revenue &amp; utilization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR per operator, billable hours, realization rate, top clients. Last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="firm_mrr" value={fmt(totalMrr)} icon={DollarSign} color="text-emerald-400" />
        <Stat label="total_hours_30d" value={`${(totalSec / 3600).toFixed(1)}h`} icon={Clock} />
        <Stat label="realization" value={`${realizationRate.toFixed(0)}%`} icon={TrendingUp} color={realizationRate > 70 ? "text-emerald-400" : realizationRate > 50 ? "text-amber-400" : "text-rose-400"} />
        <Stat label="active_clients" value={allClients.filter((c) => c.subscription?.status === "ACTIVE").length.toString()} icon={Users} />
      </div>

      {/* Per-operator table */}
      <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">per_operator_breakdown</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-card/30 border-b border-border/40 text-left">
            <tr>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">operator</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">clients</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">mrr</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">hrs_30d</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">billable</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">$/hr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {opStats.map((op) => (
              <tr key={op.id} className="hover:bg-card/30">
                <td className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{op.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{op.role.toLowerCase()}</p>
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm">{op.clients}</td>
                <td className="px-3 py-2 text-right font-mono text-sm text-emerald-400">{fmt(op.mrr)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{op.hours.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{op.billableHours.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{op.hours > 0 ? fmtD(op.revenuePerHour) : "—"}</td>
              </tr>
            ))}
            {opStats.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No operators.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Top clients */}
      <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">top_clients_by_mrr</p>
        </div>
        <ul className="divide-y divide-border/40">
          {topClients.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No active subscriptions.</li>
          ) : (
            topClients.map((c, i) => (
              <li key={c.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-card/30">
                <span className="font-mono text-xs text-muted-foreground w-6">#{i + 1}</span>
                <Link href={`/firm/${c.id}`} className="text-sm text-foreground flex-1 hover:text-emerald-400 truncate inline-flex items-center gap-1">
                  {c.name} <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border bg-card/60 px-1.5 py-0.5 rounded">
                  {c.plan.toLowerCase()}
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-400">{fmt(c.mrr)}/mo</span>
              </li>
            ))
          )}
        </ul>
      </div>
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
