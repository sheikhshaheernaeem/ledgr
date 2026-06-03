import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { GitMerge, Plus } from "lucide-react";

export default async function ReconciliationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const [accounts, reconciliations] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.reconciliation.findMany({
      where: { userId },
      include: { bankAccount: true, items: true },
      orderBy: { statementDate: "desc" },
    }),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reconciliation</h1>
          <p className="text-muted-foreground mt-1">Match your transactions to bank statements</p>
        </div>
        <Link href="/reconciliation/new">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Reconciliation
          </Button>
        </Link>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitMerge className="h-10 w-10 mb-3 opacity-20" />
            <p>No bank accounts found</p>
            <Link href="/accounts"><Button variant="outline" size="sm" className="mt-3">Add a Bank Account</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.map(acct => (
              <Card key={acct.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{acct.name}</p>
                  <p className="text-xs text-muted-foreground">{acct.accountType}</p>
                  <Link href={`/reconciliation/new?accountId=${acct.id}`}>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-xs gap-1.5">
                      <GitMerge className="h-3 w-3" /> Reconcile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {reconciliations.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Past Reconciliations</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Statement Date</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliations.map(r => {
                      const matched = r.items.filter(i => i.matched).length;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.bankAccount.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(r.statementDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">${r.statementBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-sm">{matched}/{r.items.length}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${r.status === "COMPLETED" ? "border-emerald-500/30 text-emerald-400" : "border-yellow-500/30 text-yellow-400"}`}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/reconciliation/${r.id}`}>
                              <Button size="sm" variant="outline">Review</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
