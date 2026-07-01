import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FileText, ArrowLeft } from "lucide-react";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, month: true, year: true, status: true, createdAt: true,
      totalIncome: true, totalExpenses: true, netProfit: true,
      user: { select: { name: true, email: true, companyName: true } },
    },
  });

  const fmt = (n: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" /> Reports archive
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All reports generated across all clients. {reports.length} total shown.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          <p className="text-xs text-muted-foreground mt-1.5">When clients run the AI Accountant, reports appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border/40 bg-card/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Client</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-2 text-right">Income</div>
            <div className="col-span-2 text-right">Expenses</div>
            <div className="col-span-1 text-right">Net</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          <div className="divide-y divide-border/40">
            {reports.map((r) => (
              <div key={r.id} className="grid grid-cols-12 px-4 py-3 hover:bg-card/60 transition-colors items-center text-sm">
                <div className="col-span-4 min-w-0">
                  <p className="font-medium text-foreground truncate">{r.user.companyName ?? r.user.name ?? r.user.email}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{r.user.email}</p>
                </div>
                <div className="col-span-2 font-mono text-xs text-muted-foreground">{r.month}/{r.year}</div>
                <div className="col-span-2 text-right font-mono tabular-nums text-emerald-500">{fmt(r.totalIncome)}</div>
                <div className="col-span-2 text-right font-mono tabular-nums text-rose-500">{fmt(r.totalExpenses)}</div>
                <div className={`col-span-1 text-right font-mono tabular-nums ${(r.netProfit ?? 0) >= 0 ? "text-cyan-500" : "text-rose-500"}`}>{fmt(r.netProfit)}</div>
                <div className="col-span-1 text-right">
                  <span className="font-mono text-[10px] uppercase tracking-wider border border-border bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                    {r.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
