import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PrintButton } from "./PrintButton";
import { getUserLocale } from "@/lib/getUserLocale";

function LineItem({ label, amount, indent = false, fmtFn }: { label: string; amount: number; indent?: boolean; fmtFn: (n: number) => string }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${indent ? "pl-4" : ""}`}>
      <span className={indent ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={amount < 0 ? "text-red-400" : amount > 0 ? "text-emerald-400" : "text-muted-foreground"}>
        {amount < 0 ? "-" : ""}{fmtFn(Math.abs(amount))}
      </span>
    </div>
  );
}

function SectionTotal({ label, amount, fmtFn }: { label: string; amount: number; fmtFn: (n: number) => string }) {
  return (
    <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
      <span className="font-semibold text-foreground text-sm">{label}</span>
      <span className={`font-bold text-base ${amount < 0 ? "text-red-400" : "text-emerald-400"}`}>
        {amount < 0 ? "-" : ""}{fmtFn(Math.abs(amount))}
      </span>
    </div>
  );
}

export default async function CashFlowStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);
  const monthParam = sp.month ? parseInt(sp.month, 10) : null;

  const periodStart = monthParam ? new Date(year, monthParam - 1, 1) : new Date(year, 0, 1);
  const periodEnd = monthParam
    ? new Date(year, monthParam, 0, 23, 59, 59, 999)
    : new Date(year, 11, 31, 23, 59, 59, 999);

  const [transactions, invoices, bills, fixedAssets, depreciationEntries, reports, loc] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: periodStart, lte: periodEnd }, status: "APPROVED" },
        select: { amount: true, type: true, category: true, description: true },
      }),
      prisma.invoice.findMany({
        where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { total: true, status: true },
      }),
      prisma.bill.findMany({
        where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { total: true, status: true, amountPaid: true },
      }),
      prisma.fixedAsset.findMany({
        where: { userId, purchaseDate: { gte: periodStart, lte: periodEnd } },
        select: { name: true, purchaseCost: true, disposalDate: true, disposalValue: true },
      }),
      prisma.depreciationEntry.findMany({
        where: {
          userId,
          year,
          ...(monthParam ? { month: monthParam } : {}),
          posted: true,
        },
        select: { amount: true },
      }),
      prisma.report.findMany({
        where: { userId, year, ...(monthParam ? { month: monthParam } : {}) },
        select: { totalIncome: true, totalExpenses: true, netProfit: true },
      }),
      getUserLocale(userId),
    ]);

  const fmt = loc.fmt;

  // ── Operating ────────────────────────────────────────────────────────────────
  let netIncome = 0;
  if (reports.length > 0) {
    netIncome = reports.reduce((s, r) => s + r.netProfit, 0);
  } else {
    const credits = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const debits = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    netIncome = credits - debits;
  }
  const depreciation = depreciationEntries.reduce((s, e) => s + e.amount, 0);
  const newInvoicesAmount = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.total, 0);
  const paidInvoicesAmount = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const arChange = paidInvoicesAmount - newInvoicesAmount;

  const newBillsAmount = bills.filter((b) => b.status !== "PAID").reduce((s, b) => s + b.total, 0);
  const paidBillsAmount = bills.filter((b) => b.status === "PAID").reduce((s, b) => s + b.total, 0);
  const apChange = newBillsAmount - paidBillsAmount;

  const operatingTotal = netIncome + depreciation + arChange + apChange;

  // ── Investing ────────────────────────────────────────────────────────────────
  const assetPurchases = fixedAssets.reduce((s, a) => s + a.purchaseCost, 0);
  const disposals = fixedAssets
    .filter((a) => a.disposalDate !== null)
    .reduce((s, a) => s + (a.disposalValue ?? 0), 0);
  const investingTotal = disposals - assetPurchases;

  // ── Financing ────────────────────────────────────────────────────────────────
  const ownerDraws = transactions
    .filter((t) => t.type === "DEBIT" && (t.category ?? "").toLowerCase().includes("owner"))
    .reduce((s, t) => s + t.amount, 0);
  const loanProceeds = transactions
    .filter((t) => t.type === "CREDIT" && (t.category ?? "").toLowerCase().includes("loan"))
    .reduce((s, t) => s + t.amount, 0);
  const loanPayments = transactions
    .filter((t) => t.type === "DEBIT" && (t.category ?? "").toLowerCase().includes("loan"))
    .reduce((s, t) => s + t.amount, 0);
  const financingTotal = loanProceeds - loanPayments - ownerDraws;

  const netChange = operatingTotal + investingTotal + financingTotal;

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const periodLabel = monthParam
    ? `${MONTHS[monthParam - 1]} ${year}`
    : `Full Year ${year}`;

  const hasData = transactions.length > 0 || invoices.length > 0 || bills.length > 0;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow Statement</h1>
          <p className="text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year / Month selectors */}
          <form method="GET" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={year}
              className="bg-card border border-border text-sm text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              name="month"
              defaultValue={monthParam ?? ""}
              className="bg-card border border-border text-sm text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Full Year</option>
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-3 py-1.5 rounded-md transition-colors"
            >
              Apply
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {!hasData ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Minus className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No data for this period</p>
            <p className="text-sm mt-1">
              No approved transactions or invoices found for {periodLabel}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Operating Activities */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-base text-emerald-400">Operating Activities</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Cash generated from core business operations</p>
            </CardHeader>
            <CardContent>
              <LineItem label="Net Income" amount={netIncome} fmtFn={fmt} />
              <p className="text-xs text-muted-foreground mt-2 mb-1">Adjustments for non-cash items:</p>
              <LineItem label="Depreciation & Amortization" amount={depreciation} indent fmtFn={fmt} />
              <p className="text-xs text-muted-foreground mt-2 mb-1">Changes in working capital:</p>
              <LineItem label="Change in Accounts Receivable" amount={arChange} indent fmtFn={fmt} />
              <LineItem label="Change in Accounts Payable" amount={apChange} indent fmtFn={fmt} />
              <SectionTotal label="Net Cash from Operating Activities" amount={operatingTotal} fmtFn={fmt} />
            </CardContent>
          </Card>

          {/* Investing Activities */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-base text-blue-400">Investing Activities</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Cash used for long-term investments and assets</p>
            </CardHeader>
            <CardContent>
              {fixedAssets.length > 0 ? (
                fixedAssets.map((asset, i) => (
                  <LineItem key={i} label={`Purchase: ${asset.name}`} amount={-asset.purchaseCost} indent fmtFn={fmt} />
                ))
              ) : (
                <LineItem label="Fixed Asset Purchases" amount={0} indent fmtFn={fmt} />
              )}
              <LineItem label="Proceeds from Asset Disposals" amount={disposals} indent fmtFn={fmt} />
              <SectionTotal label="Net Cash from Investing Activities" amount={investingTotal} fmtFn={fmt} />
            </CardContent>
          </Card>

          {/* Financing Activities */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-yellow-400" />
                <CardTitle className="text-base text-yellow-400">Financing Activities</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Cash from debt and equity transactions</p>
            </CardHeader>
            <CardContent>
              <LineItem label="Owner&apos;s Draws" amount={-ownerDraws} indent fmtFn={fmt} />
              <LineItem label="Loan Proceeds" amount={loanProceeds} indent fmtFn={fmt} />
              <LineItem label="Loan Repayments" amount={-loanPayments} indent fmtFn={fmt} />
              <SectionTotal label="Net Cash from Financing Activities" amount={financingTotal} fmtFn={fmt} />
            </CardContent>
          </Card>

          {/* Net Change */}
          <Card className={`border-2 ${netChange >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Change in Cash</p>
                  <p className="text-sm text-muted-foreground">{periodLabel}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${netChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {netChange >= 0 ? "+" : "-"}{fmt(Math.abs(netChange))}
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${netChange >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}`}
                  >
                    {netChange >= 0 ? "Net Positive Cash Flow" : "Net Negative Cash Flow"}
                  </Badge>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Operating</p>
                  <p className={`font-semibold mt-0.5 ${operatingTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {operatingTotal >= 0 ? "+" : "-"}{fmt(Math.abs(operatingTotal))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Investing</p>
                  <p className={`font-semibold mt-0.5 ${investingTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {investingTotal >= 0 ? "+" : "-"}{fmt(Math.abs(investingTotal))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Financing</p>
                  <p className={`font-semibold mt-0.5 ${financingTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {financingTotal >= 0 ? "+" : "-"}{fmt(Math.abs(financingTotal))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-border bg-card">
            <CardContent className="py-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> This cash flow statement is derived from approved transactions, invoices, and bills recorded in Ledgr. It uses the indirect method for operating activities. Consult your accountant for a full GAAP-compliant statement.
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
