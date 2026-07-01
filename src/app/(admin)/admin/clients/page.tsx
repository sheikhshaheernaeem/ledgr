import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Users, ArrowLeft, Mail, FileText, AlertCircle, ChevronRight } from "lucide-react";

export default async function AdminClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, name: true, companyName: true, createdAt: true,
      emailVerified: true, subscriptionStatus: true,
      _count: {
        select: { transactions: true, reports: true, aiAnalyses: true },
      },
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-500" /> Clients
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every client on the platform. {clients.length} total.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No clients yet. Sign-ups will appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border/40 bg-card/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Client</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-1 text-right">Txns</div>
            <div className="col-span-1 text-right">Reports</div>
            <div className="col-span-1 text-right">AI runs</div>
            <div className="col-span-2 text-right">Joined</div>
          </div>
          <div className="divide-y divide-border/40">
            {clients.map((c) => (
              <Link key={c.id} href={`/admin/clients/${c.id}`} className="grid grid-cols-12 px-4 py-3 hover:bg-card/60 transition-colors items-center text-sm">
                <div className="col-span-4 min-w-0">
                  <p className="font-medium text-foreground truncate">{c.companyName ?? c.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" /> {c.email}
                  </p>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  {c.emailVerified ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-500">verified</span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" /> unverified
                    </span>
                  )}
                  {c.subscriptionStatus && (
                    <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                      {c.subscriptionStatus.toLowerCase()}
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-right font-mono text-foreground tabular-nums">{c._count.transactions.toLocaleString()}</div>
                <div className="col-span-1 text-right font-mono text-foreground tabular-nums">{c._count.reports}</div>
                <div className="col-span-1 text-right font-mono text-foreground tabular-nums">{c._count.aiAnalyses}</div>
                <div className="col-span-2 text-right font-mono text-muted-foreground text-xs tabular-nums flex items-center justify-end gap-1">
                  {c.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs font-mono text-muted-foreground">
        <FileText className="h-3 w-3 inline mr-1" /> click_a_row · view_full_client_profile
      </p>
    </div>
  );
}
