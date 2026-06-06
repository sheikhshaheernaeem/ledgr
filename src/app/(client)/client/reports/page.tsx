import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart2, ExternalLink, CheckCircle2 } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function reportStatusStyle(status: string): string {
  switch (status) {
    case "APPROVED": return "border-emerald-500/30 text-emerald-400";
    case "SENT": return "border-blue-500/30 text-blue-400";
    case "DRAFT": return "border-border text-muted-foreground";
    default: return "border-border text-muted-foreground";
  }
}

export default async function ClientReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const pendingApproval = reports.filter((r) => r.status === "SENT" && !r.clientApprovedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Your monthly financial reports</p>
      </div>

      {/* Pending approval banner */}
      {pendingApproval.length > 0 && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm flex items-center justify-between gap-4">
          <div>
            <span className="font-medium text-blue-400">{pendingApproval.length} report{pendingApproval.length !== 1 ? "s" : ""} awaiting your approval</span>
            <p className="text-xs text-muted-foreground mt-0.5">Review and approve reports your accountant has sent.</p>
          </div>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No reports yet</p>
              <p className="text-xs mt-1">Monthly financial reports will appear here once generated.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const monthName = new Date(report.year, report.month - 1).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  });
                  const needsApproval = report.status === "SENT" && !report.clientApprovedAt && report.clientApprovalToken;
                  return (
                    <TableRow key={report.id} className="border-border">
                      <TableCell className="text-sm font-medium text-foreground">{monthName}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">
                        ${fmt(report.totalIncome)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-400">
                        ${fmt(report.totalExpenses)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <span className={report.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-400"}>
                          {report.netProfit >= 0 ? "+" : ""}${fmt(Math.abs(report.netProfit))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${reportStatusStyle(report.status)}`}>
                          {report.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.clientApprovedAt ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        ) : needsApproval ? (
                          <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                            Needs approval
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/reports/${report.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                          {needsApproval && (
                            <Link href={`/reports/${report.id}/approve`}>
                              <Button
                                size="sm"
                                className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white"
                              >
                                Approve
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
