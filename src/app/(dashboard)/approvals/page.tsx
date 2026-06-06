import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, ChevronDown } from "lucide-react";
import { ApprovalActions } from "./ApprovalActions";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [pendingTxs, recentResolvedTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        status: { in: ["APPROVED", "REJECTED"] },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
            {pendingTxs.length > 0 && (
              <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs">
                {pendingTxs.length} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Review and approve or reject pending transactions
          </p>
        </div>
      </div>

      {/* Pending Transactions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            Pending Approvals
            {pendingTxs.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {pendingTxs.length} transaction{pendingTxs.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingTxs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground px-6">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1">No transactions are waiting for approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-6 py-3">Date</th>
                    <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Description</th>
                    <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Category</th>
                    <th className="text-right text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Amount</th>
                    <th className="text-right text-xs text-muted-foreground font-medium uppercase tracking-wide px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTxs.map((tx, i) => (
                    <tr
                      key={tx.id}
                      className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-foreground truncate">{tx.description}</p>
                        {tx.aiNotes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.aiNotes}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {tx.category ? (
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <span className={`font-medium ${tx.type === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ApprovalActions transactionId={tx.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Resolved — collapsible via details/summary */}
      {recentResolvedTxs.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none select-none text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            Recently resolved (last 7 days) — {recentResolvedTxs.length} transaction{recentResolvedTxs.length !== 1 ? "s" : ""}
          </summary>

          <Card className="mt-3 border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-6 py-3">Date</th>
                      <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Description</th>
                      <th className="text-left text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Category</th>
                      <th className="text-right text-xs text-muted-foreground font-medium uppercase tracking-wide px-4 py-3">Amount</th>
                      <th className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wide px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResolvedTxs.map((tx, i) => (
                      <tr
                        key={tx.id}
                        className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-foreground truncate">{tx.description}</p>
                          {tx.status === "REJECTED" && tx.aiNotes && (
                            <p className="text-xs text-red-400/70 mt-0.5 truncate">Reason: {tx.aiNotes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {tx.category ?? "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`font-medium ${tx.type === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                            {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              tx.status === "APPROVED"
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }`}
                          >
                            {tx.status.toLowerCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </details>
      )}
    </div>
  );
}
