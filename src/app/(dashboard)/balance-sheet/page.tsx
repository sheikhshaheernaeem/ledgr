import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getUserLocale } from "@/lib/getUserLocale";

export default async function BalanceSheetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { prisma } = await import("@/lib/db");
  const userId = session.user.id as string;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [transactions, invoices, loc] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, status: "APPROVED" } }),
    prisma.invoice.findMany({ where: { userId, status: { in: ["SENT", "OVERDUE"] } } }),
    getUserLocale(userId),
  ]);

  const cash = transactions.reduce((s, t) => t.type === "CREDIT" ? s + t.amount : s - t.amount, 0);
  const accountsReceivable = invoices.reduce((s, i) => s + i.total, 0);
  const totalAssets = cash + accountsReceivable;

  const recentDebits = transactions.filter(t => t.type === "DEBIT" && new Date(t.date) >= thirtyDaysAgo && ["Professional Services", "Banking & Fees"].includes(t.category ?? ""));
  const accountsPayable = recentDebits.reduce((s, t) => s + t.amount, 0);
  const totalLiabilities = accountsPayable;
  const equity = totalAssets - totalLiabilities;

  const Row = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
    <div className={`flex justify-between py-2 ${bold ? "font-bold text-foreground border-t border-border mt-1 pt-3" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={value < 0 ? "text-red-400" : bold ? "text-foreground" : "text-foreground"}>{loc.fmt(value)}</span>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Balance Sheet</h1>
        <p className="text-muted-foreground mt-1">As of {loc.fmtDate(now)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base text-emerald-400">ASSETS</CardTitle></CardHeader>
          <CardContent>
            <Row label="Cash & Bank" value={cash} />
            <Row label="Accounts Receivable" value={accountsReceivable} />
            <Separator className="my-2" />
            <Row label="Total Assets" value={totalAssets} bold />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base text-red-400">LIABILITIES & EQUITY</CardTitle></CardHeader>
          <CardContent>
            <Row label="Accounts Payable" value={accountsPayable} />
            <Separator className="my-2" />
            <Row label="Total Liabilities" value={totalLiabilities} bold />
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Equity</p>
              <Row label="Net Worth" value={equity} />
              <Separator className="my-2" />
              <Row label="Total Liabilities + Equity" value={totalLiabilities + equity} bold />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Note</p>
          <p>This is a simplified balance sheet derived from your transactions and outstanding invoices. For a full balance sheet, connect all bank accounts and ensure transactions are categorized.</p>
        </CardContent>
      </Card>
    </div>
  );
}
