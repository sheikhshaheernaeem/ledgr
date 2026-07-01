import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Activity, ArrowLeft, AlertTriangle, FileText, Database, Brain } from "lucide-react";
import { getTier, fmtLimit, type TierKey, type Tier } from "@/config/tiers";
import { currentPeriod } from "@/lib/usageTracker";

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const { start, end } = currentPeriod();

  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, companyName: true, subscriptionStatus: true },
  });

  // Fetch per-user counts this period in parallel
  const rows = await Promise.all(users.map(async (u) => {
    const [documents, transactions, aiCalls] = await Promise.all([
      prisma.document.count({ where: { userId: u.id, createdAt: { gte: start, lt: end } } }),
      prisma.transaction.count({ where: { userId: u.id, createdAt: { gte: start, lt: end } } }),
      prisma.aiAnalysis.count({ where: { userId: u.id, createdAt: { gte: start, lt: end } } }),
    ]);
    const tier = getTier(u.subscriptionStatus);
    return { user: u, tier, documents, transactions, aiCalls };
  }));

  const overLimit = rows.filter((r) => r.documents >= r.tier.documentLimit || r.transactions >= r.tier.transactionLimit);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-500" /> Usage monitoring
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current billing period: {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {new Date(end.getTime() - 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
        </p>
      </div>

      {/* Over-limit summary */}
      {overLimit.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">{overLimit.length} client{overLimit.length === 1 ? "" : "s"} at or over plan limits</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              These users are blocked from uploads. Consider reaching out about an upgrade.
            </p>
          </div>
        </div>
      )}

      {/* Per-user usage table */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border/40 bg-card/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Client</div>
          <div className="col-span-2">Tier</div>
          <div className="col-span-2 text-right">Documents</div>
          <div className="col-span-2 text-right">Transactions</div>
          <div className="col-span-2 text-right">AI calls</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">No clients yet.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((r) => {
              const docOver = r.documents >= r.tier.documentLimit;
              const txnOver = r.transactions >= r.tier.transactionLimit;
              const blocked = docOver || txnOver;
              return (
                <div key={r.user.id} className={`grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-card/60 ${blocked ? "bg-rose-500/[0.04]" : ""}`}>
                  <div className="col-span-3 min-w-0">
                    <p className="font-medium text-foreground truncate">{r.user.companyName ?? r.user.name ?? "—"}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{r.user.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className={`text-xs font-mono ${r.tier.family === "ai" ? "text-cyan-500" : "text-emerald-500"}`}>
                      {r.tier.displayName}
                    </p>
                  </div>
                  <UsageCell used={r.documents} limit={r.tier.documentLimit} icon={FileText} />
                  <UsageCell used={r.transactions} limit={r.tier.transactionLimit} icon={Database} />
                  <UsageCell used={r.aiCalls} limit={r.tier.documentLimit * 3} icon={Brain} />
                  <div className="col-span-1 text-right">
                    {blocked ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-rose-500">blocked</span>
                    ) : r.documents > 0 ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-500">active</span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">idle</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UsageCell({ used, limit, icon: Icon }: { used: number; limit: number; icon: typeof FileText }) {
  const pct = limit === Infinity ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const over = limit !== Infinity && used >= limit;
  const warn = pct >= 80 && !over;
  const color = over ? "text-rose-500" : warn ? "text-amber-500" : "text-foreground";
  return (
    <div className={`col-span-2 text-right ${color}`}>
      <p className="font-mono tabular-nums text-xs flex items-center justify-end gap-1">
        <Icon className="h-3 w-3 opacity-60" />
        {used.toLocaleString()} <span className="opacity-50">/ {fmtLimit(limit)}</span>
      </p>
      {limit !== Infinity && (
        <div className="h-1 mt-1 bg-card border border-border rounded overflow-hidden">
          <div
            className={`h-full ${over ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-cyan-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
