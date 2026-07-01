import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
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
import { FileText, TrendingUp, TrendingDown, BarChart3, CheckCircle2 } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id as string },
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Your monthly profit & loss statements
          </p>
        </div>
        <Link href="/reports/consolidated">
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Consolidated View
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No reports yet</p>
            <p className="text-sm mt-1">
              Upload transactions and our team will generate your first report
            </p>
            <Link href="/transactions">
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                Upload Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {new Date(report.year, report.month - 1).toLocaleString(
                        "default",
                        { month: "long", year: "numeric" }
                      )}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        report.clientApprovedAt
                          ? "border-emerald-500/30 text-emerald-400"
                          : report.status === "SENT"
                            ? "border-emerald-500/30 text-emerald-400"
                            : report.status === "REVIEWED"
                              ? "border-cyan-500/30 text-cyan-400"
                              : "border-yellow-500/30 text-yellow-400"
                      }`}
                    >
                      {report.clientApprovedAt ? (
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> approved</span>
                      ) : report.status.toLowerCase()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {report._count.transactions} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        Income
                      </span>
                      <span className="text-emerald-400 font-medium">
                        ${report.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        Expenses
                      </span>
                      <span className="text-red-400 font-medium">
                        ${report.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Net Profit</span>
                      <span
                        className={`font-bold ${report.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {report.netProfit >= 0 ? "+" : ""}$
                        {Math.abs(report.netProfit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  {report.aiSummary && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {report.aiSummary}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
