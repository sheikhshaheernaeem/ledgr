import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [transactions, invoices, clients, bankAccounts] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: session.user.id }, orderBy: { date: "desc" } }),
    prisma.invoice.findMany({ where: { userId: session.user.id }, include: { client: true } }),
    prisma.client.findMany({ where: { userId: session.user.id } }),
    prisma.bankAccount.findMany({ where: { userId: session.user.id } }),
  ]);

  const iif = [
    "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
    "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
    "!ENDTRNS",
    "",
    ...transactions.map((t, i) => {
      const type = t.amount > 0 ? "DEPOSIT" : "CHECK";
      const acct = bankAccounts.find(a => a.id === t.bankAccountId)?.name ?? "Checking";
      const date = new Date(t.date).toLocaleDateString("en-US");
      const amt = Math.abs(t.amount).toFixed(2);
      return [
        `TRNS\t${i + 1}\t${type}\t${date}\t${acct}\t\t${t.amount < 0 ? "-" : ""}${amt}\t${t.description}`,
        `SPL\t${i + 1}\t${type}\t${date}\t${t.category ?? "Uncategorized"}\t\t${t.amount > 0 ? "-" : ""}${amt}\t${t.description}`,
        "ENDTRNS",
      ].join("\r\n");
    }),
  ].join("\r\n");

  const exportData = {
    format: "QuickBooks IIF + JSON",
    exportedAt: new Date().toISOString(),
    iif,
    json: { transactions, invoices, clients, bankAccounts },
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ledgr-quickbooks-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
