import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AlertCircle, ArrowLeft, FileX } from "lucide-react";

export default async function FailuresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const [logs, failedDocs, byStage] = await Promise.all([
    prisma.pipelineLog.findMany({
      where: { level: "error" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.document.findMany({
      where: { status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, userId: true, name: true, mimeType: true, fileSize: true, updatedAt: true },
    }),
    prisma.pipelineLog.groupBy({
      by: ["stage"],
      where: { level: "error" },
      _count: { _all: true },
    }),
  ]);

  // Fetch user info for failed documents
  const userIds = Array.from(new Set([
    ...logs.map((l) => l.userId).filter((id): id is string => !!id),
    ...failedDocs.map((d) => d.userId),
  ]));
  const userRows = userIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true, companyName: true },
  });
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <FileX className="h-5 w-5 text-rose-500" /> Pipeline failures
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Documents that failed OCR, AI classification, or validation. Investigate, retry, or close.
        </p>
      </div>

      {/* Failures by stage */}
      {byStage.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {byStage.map((s) => (
            <div key={s.stage} className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.stage}</p>
              <p className="text-2xl font-bold tracking-tight mt-1 text-rose-500">{s._count._all}</p>
            </div>
          ))}
        </div>
      )}

      {/* Failed documents */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          failed_documents · {failedDocs.length}
        </p>
        {failedDocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
            <FileX className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No failed documents — pipeline is healthy.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden divide-y divide-border/40">
            {failedDocs.map((d) => {
              const u = userMap.get(d.userId);
              return (
                <div key={d.id} className="p-3 flex items-center gap-3 hover:bg-card/60 text-sm">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{d.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {u?.companyName ?? u?.name ?? u?.email ?? d.userId} · {d.mimeType} · {d.fileSize ? `${Math.round(d.fileSize / 1024)}KB` : "—"}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {timeAgo(d.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent error logs */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          recent_errors · {logs.length}
        </p>
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
            <p className="text-sm text-muted-foreground">No errors logged.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden divide-y divide-border/40">
            {logs.map((l) => {
              const u = l.userId ? userMap.get(l.userId) : null;
              return (
                <div key={l.id} className="p-3 hover:bg-card/60">
                  <div className="flex items-center gap-2 text-xs flex-wrap mb-1">
                    <span className="font-mono uppercase tracking-wider border border-rose-500/30 bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded text-[10px]">
                      {l.stage}
                    </span>
                    {u && (
                      <span className="font-mono text-muted-foreground text-[10px]">
                        {u.companyName ?? u.name ?? u.email}
                      </span>
                    )}
                    <span className="font-mono text-muted-foreground text-[10px] ml-auto tabular-nums">
                      {timeAgo(l.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{l.message}</p>
                  {l.documentId && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">doc: {l.documentId}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
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
