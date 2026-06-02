import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertCircle, ArrowLeft, Send } from "lucide-react";

interface Props {
  params: Promise<{ reportId: string }>;
}

export default async function ReviewReportPage({ params }: Props) {
  const { reportId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      user: { select: { name: true, email: true } },
      transactions: { orderBy: { date: "desc" } },
    },
  });

  if (!report) notFound();

  const monthName = new Date(report.year, report.month - 1).toLocaleString(
    "default",
    { month: "long", year: "numeric" }
  );

  const byCategory: Record<string, { count: number; total: number }> = {};
  report.transactions.forEach((t) => {
    const cat = t.category ?? "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
    byCategory[cat].count++;
    byCategory[cat].total += t.amount;
  });

  const lowConfidence = report.transactions.filter(
    (t) => t.confidence !== null && t.confidence < 0.75
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {report.user.name ?? report.user.email} — {monthName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {report.transactions.length} transactions to review
          </p>
        </div>
        <div className="flex gap-3">
          <form action={`/api/reports/approve`} method="POST">
            <input type="hidden" name="reportId" value={report.id} />
            <Button variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Mark Reviewed
            </Button>
          </form>
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Send className="h-4 w-4" />
            Send to Client
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: `$${report.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-emerald-400" },
          { label: "Total Expenses", value: `$${report.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-red-400" },
          {
            label: "Net Profit",
            value: `${report.netProfit >= 0 ? "+" : ""}$${Math.abs(report.netProfit).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            color: report.netProfit >= 0 ? "text-emerald-400" : "text-red-400",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {s.label}
              </p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <Card className="border-border border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-400">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">
              {report.aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Low confidence warnings */}
      {lowConfidence.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {lowConfidence.length} Low-Confidence Categorizations — Review These
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowConfidence.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">{t.description}</span>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400"
                    >
                      {t.category ?? "?"}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {((t.confidence ?? 0) * 100).toFixed(0)}% confident
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
            <CardDescription>Expense breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cat, data]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground truncate">{cat}</span>
                    <span className="text-foreground font-medium ml-2 whitespace-nowrap">
                      ${data.total.toFixed(0)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({data.count})
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* All transactions */}
        <Card className="col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">All Transactions</CardTitle>
            <CardDescription>
              Review categorizations before approving
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
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
                  {report.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tx.confidence !== null && tx.confidence < 0.75 && (
                            <AlertCircle className="h-3 w-3 text-yellow-400 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {tx.category ?? "—"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {tx.type === "CREDIT" ? "+" : "-"}$
                          {tx.amount.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
