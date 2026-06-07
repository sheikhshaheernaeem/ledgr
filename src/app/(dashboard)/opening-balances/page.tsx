import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import OpeningBalancesForm from "./OpeningBalancesForm";

export default async function OpeningBalancesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;

  const [accounts, balances] = await Promise.all([
    prisma.chartOfAccount.findMany({ where: { userId, isActive: true }, orderBy: [{ type: "asc" }, { code: "asc" }] }),
    prisma.openingBalance.findMany({ where: { userId } }),
  ]);

  const balanceMap = Object.fromEntries(balances.map((b) => [b.accountCode, { debit: b.debit, credit: b.credit, asOfDate: b.asOfDate.toISOString() }]));

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-400" /> Opening Balances
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter account balances from your previous system to start with accurate books.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Account Balances</CardTitle>
          <CardDescription>Enter the closing balance from your prior system for each account.</CardDescription>
        </CardHeader>
        <CardContent>
          <OpeningBalancesForm
            accounts={accounts.map((a) => ({ code: a.code, name: a.name, type: a.type }))}
            initialBalances={balanceMap}
            initialAsOfDate={balances[0]?.asOfDate?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
