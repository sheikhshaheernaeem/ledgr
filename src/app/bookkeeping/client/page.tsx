import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Wallet, Calculator, Receipt, FolderOpen, Upload,
  TrendingUp, TrendingDown, Activity, MessageSquare, FileText, ChevronRight, Sparkles,
} from "lucide-react";

// Auth + role + family("bookkeeping") are already enforced by src/app/bookkeeping/client/layout.tsx.
export default async function BookkeepingHome() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [user, txnCount, docCount, reportCount, unreadMsgs, incomeAgg, expenseAgg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, companyName: true, currency: true } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.report.count({ where: { userId } }),
    prisma.message.count({ where: { userId, readAt: null } }),
    prisma.transaction.aggregate({ where: { userId, type: "INCOME" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);

  const totalIncome = Math.abs(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Math.abs(expenseAgg._sum.amount ?? 0);
  const netProfit = totalIncome - totalExpenses;
  const currency = user?.currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const firstName = (user?.name ?? session!.user!.email ?? "").split(" ")[0]?.split("@")[0] ?? "there";

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> BOOK_KEEPING_SERVICES
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          Full-service human-reviewed bookkeeping. Monthly P&amp;L, tax prep, invoicing, document vault. Your dedicated accountant keeps everything tidy.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Income" value={fmt(totalIncome)} icon={TrendingUp} color="text-emerald-500" />
        <StatCard label="Expenses" value={fmt(totalExpenses)} icon={TrendingDown} color="text-rose-500" />
        <StatCard label="Net" value={fmt(netProfit)} icon={Activity} color={netProfit >= 0 ? "text-emerald-500" : "text-rose-500"} />
        <StatCard label="Reports" value={String(reportCount)} icon={FileText} color="text-foreground" />
      </div>

      {/* Feature grid */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">your_workspace</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            href="/bookkeeping/client/financials"
            icon={Wallet}
            title="My Books"
            desc="Monthly close, journal, accounts, balance sheet."
            badge={`${txnCount.toLocaleString()} txns`}
          />
          <FeatureCard
            href="/bookkeeping/client/tax"
            icon={Calculator}
            title="Tax dashboard"
            desc="Quarterly estimates, deductions, tax-ready reports."
          />
          <FeatureCard
            href="/bookkeeping/client/invoices"
            icon={Receipt}
            title="Invoices"
            desc="Create, send, track invoices and accounts receivable."
          />
          <FeatureCard
            href="/bookkeeping/client/documents"
            icon={FolderOpen}
            title="Document vault"
            desc="Receipts, contracts, statements — all securely stored."
            badge={`${docCount} files`}
          />
          <FeatureCard
            href="/bookkeeping/client/upload"
            icon={Upload}
            title="Upload statement"
            desc="Drop a CSV/PDF — your accountant categorizes it."
          />
          <FeatureCard
            href="/client/messages"
            icon={MessageSquare}
            title="Messages"
            desc="Direct line to your accountant."
            badge={unreadMsgs > 0 ? `${unreadMsgs} new` : undefined}
            badgeAccent={unreadMsgs > 0}
          />
          <FeatureCard
            href="/client/requests"
            icon={Sparkles}
            title="Request work"
            desc="Tax filings, audits, special projects — open a ticket."
          />
        </div>
      </div>

      {/* AI cross-promo */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-cyan-500 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">Want instant AI-extracted books too?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The AI Accountant Services tier processes documents in seconds. Your human accountant reviews the AI output instead of starting from scratch.
          </p>
        </div>
        <Link
          href="/ai"
          className="font-mono text-xs text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1 shrink-0"
        >
          try ai_accountant <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof TrendingUp; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function FeatureCard({
  href, icon: Icon, title, desc, badge, badgeAccent,
}: { href: string; icon: typeof Wallet; title: string; desc: string; badge?: string; badgeAccent?: boolean }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border/60 bg-card/40 hover:border-emerald-500/30 hover:bg-card/60 transition-all p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center">
          <Icon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
        </div>
        {badge && (
          <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            badgeAccent
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
              : "border border-border bg-background/60 text-muted-foreground"
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="font-semibold text-foreground text-sm group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
