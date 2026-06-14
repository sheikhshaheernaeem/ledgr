import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Inbox, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const rawRequests = await prisma.clientServiceRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const clientIds = Array.from(new Set(rawRequests.map((r) => r.clientId)));
  const clientRows = clientIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, email: true, companyName: true },
  });
  const clientMap = new Map(clientRows.map((c) => [c.id, c]));
  const requests = rawRequests.map((r) => ({
    ...r,
    client: clientMap.get(r.clientId) ?? { name: null, email: "(unknown)", companyName: null },
  }));

  const stats = {
    open: requests.filter((r) => r.status === "OPEN" || r.status === "ALLOCATED").length,
    inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
    done: requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-blue-500" /> Service requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All requests submitted by clients. Latest 100 shown.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Open" value={stats.open} accent="text-amber-500" icon={Clock} />
        <Stat label="In progress" value={stats.inProgress} accent="text-blue-500" icon={Clock} />
        <Stat label="Completed" value={stats.done} accent="text-emerald-500" icon={CheckCircle2} />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No service requests yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden divide-y divide-border/40">
          {requests.map((r) => (
            <div key={r.id} className="p-4 hover:bg-card/60 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <StatusPill status={r.status} />
                    <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                      {r.category.toLowerCase().replace(/_/g, " ")}
                    </span>
                    {r.urgency === "HIGH" && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-rose-500">● urgent</span>
                    )}
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                  <p className="text-[11px] font-mono text-muted-foreground mt-2">
                    {r.client.companyName ?? r.client.name ?? r.client.email} ·{" "}
                    {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: number; accent: string; icon: typeof Clock }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-4 w-4 ${accent}`} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    ALLOCATED: "text-blue-500 border-blue-500/30 bg-blue-500/10",
    IN_PROGRESS: "text-blue-500 border-blue-500/30 bg-blue-500/10",
    COMPLETED: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    CANCELLED: "text-muted-foreground border-border bg-background/60",
  };
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 rounded ${map[status] ?? "text-muted-foreground border-border"}`}>
      {status.toLowerCase()}
    </span>
  );
}
