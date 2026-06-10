import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { ExportTransactionsButton } from "./ExportTransactionsButton";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default async function ClientTransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as { role?: string }).role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { id: true, date: true, description: true, amount: true, type: true, category: true, subcategory: true },
  });

  const totalIncome = transactions.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const categoryMap: Record<string, number> = {};
  transactions.filter(t => t.type === "DEBIT").forEach(t => {
    const cat = t.category ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + t.amount;
  });
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1 text-sm">{transactions.length} total transactions from all uploaded statements</p>
        </div>
        <ExportTransactionsButton transactions={transactions} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit</p>
              <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-emerald-400" : "text-red-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(Math.abs(net))}</p>
            <p className="text-xs text-muted-foreground">{net >= 0 ? "profit" : "loss"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top expense categories */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCategories.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-40 truncate">{cat}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-medium text-right w-24 shrink-0">{fmt(amt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <p>No transactions yet. Upload a bank statement to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm max-w-[220px]">
                      <p className="truncate">{tx.description}</p>
                      {tx.subcategory && <p className="text-xs text-muted-foreground">{tx.subcategory}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                        {tx.category ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      <span className={tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}>
                        {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${tx.type === "CREDIT" ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}`}>
                        {tx.type === "CREDIT" ? "income" : "expense"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
