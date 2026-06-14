import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { ReportsArchive } from "@/components/client/ReportsArchive";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  const [reports, user] = await Promise.all([
    prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, month: true, year: true, status: true,
        totalIncome: true, totalExpenses: true, netProfit: true,
        aiSummary: true, createdAt: true,
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link href="/client" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_ai_accountant
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" /> Reports archive
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every AI-generated report you&apos;ve created. Re-download as PDF or CSV anytime.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reports yet.</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Process a document on{" "}
            <Link href="/client" className="text-blue-500 hover:text-blue-400">your AI accountant</Link>{" "}
            and download a report — it&apos;ll appear here.
          </p>
        </div>
      ) : (
        <ReportsArchive
          reports={reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          currency={user?.currency ?? "USD"}
        />
      )}

      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center justify-center gap-1 w-full">
        <Sparkles className="h-2.5 w-2.5" /> every_report · regeneratable · forever
      </p>
    </div>
  );
}
