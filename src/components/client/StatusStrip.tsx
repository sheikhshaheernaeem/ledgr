import Link from "next/link";
import { prisma } from "@/lib/db";
import { Wallet, TrendingUp, Activity } from "lucide-react";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });

const monthName = (m: number, y: number) =>
  new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "numeric" });

export async function StatusStrip({ userId }: { userId: string }) {
   
  const now = new Date();
  const closingMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const closingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [user, bankAccounts, last90Txns, monthReport] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    prisma.bankAccount.findMany({ where: { userId }, select: { currentBalance: true } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: ninetyDaysAgo } },
      select: { type: true, amount: true },
    }),
    prisma.report.findFirst({
      where: { userId, month: closingMonth, year: closingYear },
      select: { status: true, draftedAt: true, accountantApprovedAt: true, sentAt: true, clientApprovedAt: true },
    }),
  ]);

  const currency = user?.currency ?? "USD";
  const cashOnHand = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const last90Revenue = last90Txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const last90Expense = last90Txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const monthlyBurn = (last90Expense - last90Revenue) / 3;
  const runwayMonths = monthlyBurn > 0 && cashOnHand > 0 ? cashOnHand / monthlyBurn : Infinity;

  // Determine current close status
  let statusLabel = "Waiting on your data";
  if (monthReport?.clientApprovedAt) statusLabel = "Closed ✓";
  else if (monthReport?.sentAt) statusLabel = "Awaiting your approval";
  else if (monthReport?.accountantApprovedAt) statusLabel = "Ready to send";
  else if (monthReport?.draftedAt) statusLabel = "Accountant reviewing";
  else if (monthReport) statusLabel = "AI categorizing";

  return (
    <Link
      href="/client/financials"
      className="block rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 transition-colors px-5 py-4"
    >
      <div className="grid grid-cols-3 gap-4">
        <Item icon={Wallet} label="cash" value={fmt(cashOnHand, currency)} color={cashOnHand > 0 ? "text-emerald-400" : "text-muted-foreground"} />
        <Item
          icon={TrendingUp}
          label="runway"
          value={!Number.isFinite(runwayMonths) || monthlyBurn <= 0 ? "∞" : `${runwayMonths.toFixed(1)}mo`}
          color={!Number.isFinite(runwayMonths) || runwayMonths > 12 ? "text-emerald-400" : runwayMonths > 6 ? "text-amber-400" : "text-rose-400"}
        />
        <Item
          icon={Activity}
          label={`${monthName(closingMonth, closingYear).toLowerCase()}_close`}
          value={statusLabel}
          small
        />
      </div>
    </Link>
  );
}

function Item({ icon: Icon, label, value, color = "text-foreground", small = false }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={`${small ? "text-sm font-medium" : "text-lg font-bold"} ${color} mt-1`}>{value}</p>
    </div>
  );
}
