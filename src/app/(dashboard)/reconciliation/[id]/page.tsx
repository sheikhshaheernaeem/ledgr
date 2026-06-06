import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { CheckCircle2, XCircle, GitMerge } from "lucide-react";
import ReconciliationActions from "./ReconciliationActions";

export default async function ReconciliationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id, userId },
    include: {
      bankAccount: true,
      items: {
        include: { transaction: true },
        orderBy: { transaction: { date: "desc" } },
      },
    },
  });
  if (!reconciliation) notFound();

  const matched = reconciliation.items.filter(i => i.matched).length;
  const total = reconciliation.items.length;
  const matchedSum = reconciliation.items
    .filter(i => i.matched && i.transaction)
    .reduce((s, i) => {
      const t = i.transaction!;
      return t.type === "CREDIT" ? s + t.amount : s - t.amount;
    }, 0);
  const difference = reconciliation.statementBalance - matchedSum;

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconciliation</h1>
          <p className="text-muted-foreground mt-1">
            {reconciliation.bankAccount.name} · {new Date(reconciliation.statementDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${reconciliation.status === "COMPLETED" ? "border-emerald-500/30 text-emerald-400" : "border-yellow-500/30 text-yellow-400"}`}>
            {reconciliation.status}
          </Badge>
          <Link href="/reconciliation"><Button variant="outline" size="sm">Back</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Statement Balance", value: `$${reconciliation.statementBalance.toFixed(2)}`, color: "text-foreground" },
          { label: "Matched Balance", value: `$${matchedSum.toFixed(2)}`, color: "text-foreground" },
          { label: "Difference", value: `$${Math.abs(difference).toFixed(2)}`, color: Math.abs(difference) < 0.01 ? "text-emerald-400" : "text-yellow-400" },
          { label: "Items Matched", value: `${matched}/${total}`, color: "text-foreground" },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {Math.abs(difference) < 0.01 && reconciliation.status !== "COMPLETED" && (
        <ReconciliationActions reconciliationId={id} />
      )}

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Transaction Items</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-3 text-xs text-muted-foreground uppercase px-3 pb-2">
              <div className="col-span-1">Match</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-5">Description</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {reconciliation.items.map(item => {
              const tx = item.transaction;
              if (!tx) return null;
              return (
                <div key={item.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border ${item.matched ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/40"}`}>
                  <div className="col-span-1">
                    {item.matched
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</div>
                  <div className="col-span-5">
                    <p className="text-sm truncate">{tx.description}</p>
                    {tx.category && <p className="text-xs text-muted-foreground">{tx.category}</p>}
                  </div>
                  <div className={`col-span-3 text-right text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
