import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Activity, ExternalLink } from "lucide-react";

const actionStyle: Record<string, string> = {
  CREATE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  UPDATE: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  DELETE: "border-rose-500/40 bg-rose-500/10 text-rose-400",
};

export default async function FirmAuditPage({ searchParams }: { searchParams: Promise<{ clientId?: string; action?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") redirect("/client");
  const userId = session.user.id as string;
  const isAdmin = role === "ADMIN";

  const params = await searchParams;
  const filterClientId = params.clientId;
  const filterAction = params.action;

  const clientIds = isAdmin
    ? (await prisma.user.findMany({ where: { role: "CLIENT" }, select: { id: true } })).map((u) => u.id)
    : (await prisma.managedClient.findMany({ where: { accountantId: userId, isActive: true }, select: { clientId: true } })).map((mc) => mc.clientId);

  const where: Record<string, unknown> = {};
  if (filterClientId) where.userId = filterClientId;
  else where.userId = { in: clientIds };
  if (filterAction) where.action = filterAction;

  const [logs, allClients] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, email: true, companyName: true },
    }),
  ]);

  const clientMap = new Map(allClients.map((c) => [c.id, c.companyName ?? c.name ?? c.email]));

  // Lookup actors (the userId field on AuditLog is the OWNER; we need actor too if available; for now just show userId as actor's client and show in-line)
  const actorIds = [...new Set(logs.map((l) => l.userId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true, role: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const actionCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.action] = (acc[l.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> firm / audit_log
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every action taken on client data. Required for compliance, useful for debugging.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <Stat label="recent_actions" value={logs.length.toString()} />
        <Stat label="creates" value={(actionCounts.CREATE ?? 0).toString()} color="text-emerald-400" />
        <Stat label="updates" value={(actionCounts.UPDATE ?? 0).toString()} color="text-blue-400" />
        <Stat label="deletes" value={(actionCounts.DELETE ?? 0).toString()} color="text-rose-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-muted-foreground">filters:</span>
        {(["", "CREATE", "UPDATE", "DELETE"] as const).map((a) => (
          <Link
            key={a || "all"}
            href={a ? `/firm/audit?action=${a}` : "/firm/audit"}
            className={`px-2.5 py-1.5 rounded-md border transition-colors ${
              (filterAction ?? "") === a ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {a ? a.toLowerCase() : "all"}
          </Link>
        ))}
        {filterClientId && (
          <Link href="/firm/audit" className="px-2.5 py-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-400">
            × clear client filter
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No audit entries match</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {logs.map((l) => {
            const actor = actorMap.get(l.userId);
            return (
              <li key={l.id} className="rounded-md border border-border/60 bg-card/40 p-3 flex items-start gap-3 hover:bg-card/60">
                <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${actionStyle[l.action] ?? "border-border bg-card/60 text-muted-foreground"}`}>
                  {l.action.toLowerCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-mono text-xs text-muted-foreground">{l.entityType}</span>
                    {actor && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        by {actor.name ?? actor.email}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {clientMap.get(l.userId) && (
                      <Link href={`/firm/${l.userId}`} className="hover:text-foreground inline-flex items-center gap-1">
                        ↳ {clientMap.get(l.userId)} <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                    {" · "}
                    entity_id: {l.entityId.slice(0, 12)}…
                    {" · "}
                    {new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground leading-relaxed">
        Showing last 200 events. For full export, use{" "}
        <Link href="/admin" className="text-emerald-400 hover:underline">admin → exports</Link>.
      </div>
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
