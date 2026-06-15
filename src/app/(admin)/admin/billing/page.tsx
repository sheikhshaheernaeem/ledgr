import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TIERS, getTier, type TierKey, type Tier } from "@/config/tiers";
import { CreditCard, ArrowLeft, TrendingUp, Users } from "lucide-react";
import { TierControl } from "@/components/admin/TierControl";
import { getRecentAudit } from "@/lib/auditLogs";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const [users, audit] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, companyName: true,
        subscriptionStatus: true, createdAt: true,
      },
    }),
    getRecentAudit(20),
  ]);

  // MRR by tier
  const tierCounts: Record<string, number> = {};
  let mrr = 0;
  for (const u of users) {
    const t = getTier(u.subscriptionStatus);
    tierCounts[t.slug] = (tierCounts[t.slug] ?? 0) + 1;
    mrr += t.price;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-500" /> Billing &amp; Tiers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set every client&apos;s subscription. Changes apply instantly and are audit-logged.
        </p>
      </div>

      {/* MRR + counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="MRR" value={fmt(mrr)} icon={TrendingUp} accent="text-blue-500" sub={`${users.length} active clients`} />
        <Stat label="Annual run-rate" value={fmt(mrr * 12)} icon={TrendingUp} accent="text-emerald-500" />
        <Stat label="AI clients" value={`${sumFamily(tierCounts, "ai")}`} icon={Users} accent="text-blue-500" />
        <Stat label="Bookkeeping clients" value={`${sumFamily(tierCounts, "bookkeeping")}`} icon={Users} accent="text-emerald-500" />
      </div>

      {/* Tier breakdown */}
      <section className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-card/60">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">tier_breakdown</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
          {(Object.values(TIERS) as Tier[]).map((t) => (
            <div key={t.slug} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground text-sm">{t.displayName}</p>
                <span className={`font-mono text-[10px] uppercase tracking-wider ${t.family === "ai" ? "text-blue-500" : "text-emerald-500"}`}>
                  {t.family}
                </span>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-2 tabular-nums">{tierCounts[t.slug] ?? 0}</p>
              <p className="font-mono text-[10px] text-muted-foreground">${t.price}/mo · {fmtN(t.documentLimit)} docs · priority {t.priority}</p>
            </div>
          ))}
        </div>
      </section>

      {/* User control */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          user_tier_control · {users.length}
        </p>
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          {users.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground text-center">No clients yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {users.map((u) => {
                const t = getTier(u.subscriptionStatus);
                return (
                  <li key={u.id} className="p-3 hover:bg-card/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {u.companyName ?? u.name ?? "—"}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">current</p>
                        <p className={`font-mono text-xs ${t.family === "ai" ? "text-blue-500" : "text-emerald-500"}`}>
                          {t.displayName} · ${t.price}/mo
                        </p>
                      </div>
                      <TierControl userId={u.id} currentTier={u.subscriptionStatus ?? null} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Recent audit */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          recent_admin_actions · {audit.length}
        </p>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin actions yet.</p>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden divide-y divide-border/40">
            {audit.map((a) => (
              <div key={a.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                <span className="font-mono uppercase tracking-wider text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10">
                  {a.action}
                </span>
                <span className="font-mono text-muted-foreground truncate flex-1">
                  {a.entityType} · {a.entityId.slice(0, 12)}…
                </span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {timeAgo(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent, sub }: { label: string; value: string; icon: typeof TrendingUp; accent: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function sumFamily(counts: Record<string, number>, family: "ai" | "bookkeeping"): number {
  return (Object.values(TIERS) as Tier[])
    .filter((t) => t.family === family)
    .reduce((s, t) => s + (counts[t.slug] ?? 0), 0);
}

function fmtN(n: number): string {
  return n === Infinity ? "∞" : n.toLocaleString();
}

function timeAgo(d: Date): string {
  // eslint-disable-next-line react-hooks/purity
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
