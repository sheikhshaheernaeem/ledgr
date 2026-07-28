import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { TransactionsTable } from "@/components/client/TransactionsTable";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  const [transactions, totals, user, incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 500,
      select: {
        id: true, date: true, description: true, amount: true, type: true,
        category: true, confidence: true, aiNotes: true,
      },
    }),
    prisma.transaction.aggregate({
      where: { userId },
      _count: { _all: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    prisma.transaction.aggregate({ where: { userId, type: "INCOME" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);

  const totalIncome = Math.abs(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Math.abs(expenseAgg._sum.amount ?? 0);
  const currency = user?.currency ?? "USD";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link href="/ai/client" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> back_to_ai_accountant
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" /> Transaction history
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every transaction your AI accountant has extracted. {totals._count._all} total · last 500 shown.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Income" value={totalIncome} currency={currency} positive icon={TrendingUp} />
        <Metric label="Expenses" value={totalExpenses} currency={currency} icon={TrendingDown} />
        <Metric label="Net" value={totalIncome - totalExpenses} currency={currency} positive={totalIncome - totalExpenses >= 0} accent />
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Upload a document on{" "}
            <Link href="/ai/client" className="text-cyan-500 hover:text-cyan-400">your AI accountant</Link>{" "}
            and they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <TransactionsTable
          transactions={transactions.map((t) => ({
            ...t,
            date: t.date.toISOString(),
          }))}
          currency={currency}
        />
      )}
    </div>
  );
}

function Metric({
  label, value, currency, positive, accent, icon: Icon,
}: { label: string; value: number; currency: string; positive?: boolean; accent?: boolean; icon?: typeof TrendingUp }) {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Math.abs(value));
  const color = accent
    ? (positive ? "text-cyan-500 dark:text-cyan-400" : "text-rose-500")
    : positive
      ? "text-emerald-500"
      : "text-rose-500";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2">
        {Icon ? <Icon className={`h-4 w-4 ${color}`} /> : <span className={`w-2.5 h-2.5 rounded-full ${color.replace("text-", "bg-")}`} />}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>
        {value < 0 ? "−" : ""}{fmt}
      </p>
    </div>
  );
}
