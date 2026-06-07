import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Maps a transaction category to a chart-of-accounts code
function categoryToCode(category: string | null | undefined): string {
  if (!category) return "6000";
  const c = category.toLowerCase().trim();
  if (c === "revenue") return "4000";
  if (c === "cost of goods sold") return "5000";
  if (c === "payroll & benefits") return "6000";
  if (c === "rent & utilities") return "6100";
  if (c === "marketing & advertising") return "6200";
  if (c === "software & subscriptions") return "6300";
  if (c === "professional services") return "6400";
  if (c === "insurance") return "6500";
  if (c === "travel & meals") return "6600";
  if (c === "depreciation") return "6700";
  return "6000"; // catch-all expense
}

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build date filter for transactions
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59");

  // Query all transactions for the user (optionally date-filtered)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
  });

  // Build ledger map: accountCode -> { debit, credit }
  const ledger = new Map<string, { debit: number; credit: number }>();

  function addToLedger(code: string, side: "debit" | "credit", amount: number) {
    const entry = ledger.get(code) ?? { debit: 0, credit: 0 };
    entry[side] += amount;
    ledger.set(code, entry);
  }

  for (const txn of transactions) {
    const amount = Math.abs(txn.amount);
    if (txn.type === "CREDIT") {
      // Income: DEBIT Cash (1000), CREDIT Revenue (4000)
      addToLedger("1000", "debit", amount);
      addToLedger("4000", "credit", amount);
    } else if (txn.type === "DEBIT") {
      // Expense: CREDIT Cash (1000), DEBIT [expense account by category]
      const expenseCode = categoryToCode(txn.category);
      addToLedger("1000", "credit", amount);
      addToLedger(expenseCode, "debit", amount);
    }
  }

  // Get chart of accounts for the user
  const accounts = await prisma.chartOfAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { code: "asc" },
  });

  // Build rows — only include accounts that have ledger activity
  const rows = accounts
    .filter((a) => ledger.has(a.code))
    .map((a) => {
      const { debit, credit } = ledger.get(a.code)!;
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        normalBalance: a.normalBalance,
        debit,
        credit,
        net: debit - credit,
      };
    });

  // For any ledger entries whose code doesn't map to a known account, still include them
  for (const [code, { debit, credit }] of ledger.entries()) {
    if (!accounts.some((a) => a.code === code)) {
      // Derive a synthetic name/type
      let name = code;
      let type = "EXPENSE";
      if (code === "1000") { name = "Cash & Bank"; type = "ASSET"; }
      else if (code === "4000") { name = "Revenue"; type = "REVENUE"; }
      else if (code === "5000") { name = "Cost of Goods Sold"; type = "EXPENSE"; }
      else if (code === "6000") { name = "Payroll & Benefits"; type = "EXPENSE"; }
      else if (code === "6100") { name = "Rent & Utilities"; type = "EXPENSE"; }
      else if (code === "6200") { name = "Marketing & Advertising"; type = "EXPENSE"; }
      else if (code === "6300") { name = "Software & Subscriptions"; type = "EXPENSE"; }
      else if (code === "6400") { name = "Professional Services"; type = "EXPENSE"; }
      else if (code === "6500") { name = "Insurance"; type = "EXPENSE"; }
      else if (code === "6600") { name = "Travel & Meals"; type = "EXPENSE"; }
      else if (code === "6700") { name = "Depreciation"; type = "EXPENSE"; }

      rows.push({
        accountId: code,
        code,
        name,
        type,
        normalBalance: type === "ASSET" ? "DEBIT" : type === "REVENUE" ? "CREDIT" : "DEBIT",
        debit,
        credit,
        net: debit - credit,
      });
    }
  }

  // Sort rows by code
  rows.sort((a, b) => a.code.localeCompare(b.code));

  // Group by account type
  const grouped: Record<string, typeof rows> = {};
  for (const type of TYPE_ORDER) {
    const typeRows = rows.filter((r) => r.type === type);
    if (typeRows.length > 0) grouped[type] = typeRows;
  }

  // Grand totals
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return NextResponse.json({
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    rows,
    grouped,
    totalDebit,
    totalCredit,
    balanced,
  });
}
