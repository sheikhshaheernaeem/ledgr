import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const report = await prisma.report.findFirst({ where: { id, userId } });
  if (!report) notFound();

  // Fetch transactions for this report's month/year
  const startDate = new Date(report.year, report.month - 1, 1);
  const endDate = new Date(report.year, report.month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "APPROVED", date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });

  const income = transactions.filter(t => t.type === "CREDIT");
  const expenses = transactions.filter(t => t.type === "DEBIT");

  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  // Group expenses by category
  const byCat: Record<string, number> = {};
  expenses.forEach(t => { const c = t.category ?? "Other"; byCat[c] = (byCat[c] ?? 0) + t.amount; });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const monthName = startDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">P&L — {monthName}</h1>
          <p className="text-muted-foreground mt-1">Profit & Loss Statement</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${
            report.status === "SENT" ? "border-emerald-500/30 text-emerald-400" :
            report.status === "REVIEWED" ? "border-blue-500/30 text-blue-400" :
            "border-yellow-500/30 text-yellow-400"
          }`}>{report.status}</Badge>
          <Link href={`/reports/${id}/print`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </Link>
            <Link href="/reports"><Button variant="outline" size="sm">Back</Button></Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: totalIncome, color: "text-emerald-400" },
          { label: "Total Expenses", value: totalExpenses, color: "text-red-400" },
          { label: "Net Profit", value: report.netProfit, color: report.netProfit >= 0 ? "text-emerald-400" : "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{fmt(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue section */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base text-emerald-400">Revenue</CardTitle></CardHeader>
        <CardContent>
          {income.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income transactions this month</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {income.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.category ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">{fmt(t.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-bold text-white pt-3">Total Revenue</TableCell>
                  <TableCell className="text-right font-bold text-emerald-400 pt-3">{fmt(totalIncome)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expenses by category */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base text-red-400">Expenses by Category</CardTitle></CardHeader>
        <CardContent>
          {catRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expense transactions this month</p>
          ) : (
            <div className="space-y-2">
              {catRows.map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 text-sm">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="text-red-400 font-medium">{fmt(amt)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold text-white">
                <span>Total Expenses</span>
                <span className="text-red-400">{fmt(totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI summary */}
      {report.aiSummary && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">AI Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{report.aiSummary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
