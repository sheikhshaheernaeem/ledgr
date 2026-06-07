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

interface AccountMeta {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
}

const ACCOUNT_DEFAULTS: Record<string, AccountMeta> = {
  "1000": { code: "1000", name: "Cash & Bank", type: "ASSET", normalBalance: "DEBIT" },
  "4000": { code: "4000", name: "Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  "5000": { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normalBalance: "DEBIT" },
  "6000": { code: "6000", name: "Payroll & Benefits", type: "EXPENSE", normalBalance: "DEBIT" },
  "6100": { code: "6100", name: "Rent & Utilities", type: "EXPENSE", normalBalance: "DEBIT" },
  "6200": { code: "6200", name: "Marketing & Advertising", type: "EXPENSE", normalBalance: "DEBIT" },
  "6300": { code: "6300", name: "Software & Subscriptions", type: "EXPENSE", normalBalance: "DEBIT" },
  "6400": { code: "6400", name: "Professional Services", type: "EXPENSE", normalBalance: "DEBIT" },
  "6500": { code: "6500", name: "Insurance", type: "EXPENSE", normalBalance: "DEBIT" },
  "6600": { code: "6600", name: "Travel & Meals", type: "EXPENSE", normalBalance: "DEBIT" },
  "6700": { code: "6700", name: "Depreciation", type: "EXPENSE", normalBalance: "DEBIT" },
};

interface LedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  ref: string;
  accountCode: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const accountCode = searchParams.get("accountCode");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59");

  // Query all transactions for the user (optionally date-filtered)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    orderBy: { date: "asc" },
  });

  // Expand each transaction into two ledger entries (double-entry)
  const allEntries: LedgerEntry[] = [];

  for (const txn of transactions) {
    const amount = Math.abs(txn.amount);
    const dateStr = txn.date instanceof Date
      ? txn.date.toISOString().split("T")[0]
      : String(txn.date).split("T")[0];

    if (txn.type === "CREDIT") {
      // Income: DEBIT Cash (1000), CREDIT Revenue (4000)
      allEntries.push({
        date: dateStr,
        description: txn.description,
        debit: amount,
        credit: 0,
        balance: 0, // calculated below per-account
        ref: txn.id,
        accountCode: "1000",
      });
      allEntries.push({
        date: dateStr,
        description: txn.description,
        debit: 0,
        credit: amount,
        balance: 0,
        ref: txn.id,
        accountCode: "4000",
      });
    } else if (txn.type === "DEBIT") {
      // Expense: CREDIT Cash (1000), DEBIT [expense account by category]
      const expenseCode = categoryToCode(txn.category);
      allEntries.push({
        date: dateStr,
        description: txn.description,
        debit: 0,
        credit: amount,
        balance: 0,
        ref: txn.id,
        accountCode: "1000",
      });
      allEntries.push({
        date: dateStr,
        description: txn.description,
        debit: amount,
        credit: 0,
        balance: 0,
        ref: txn.id,
        accountCode: expenseCode,
      });
    }
  }

  // Collect all account codes that appear in the ledger entries
  const usedCodes = [...new Set(allEntries.map((e) => e.accountCode))].sort();

  // Resolve account metadata: prefer DB record, fall back to ACCOUNT_DEFAULTS
  const dbAccounts = await prisma.chartOfAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { code: "asc" },
  });
  const dbAccountMap = new Map(dbAccounts.map((a) => [a.code, a]));

  function resolveAccount(code: string): AccountMeta {
    const db = dbAccountMap.get(code);
    if (db) return { code: db.code, name: db.name, type: db.type, normalBalance: db.normalBalance };
    return ACCOUNT_DEFAULTS[code] ?? { code, name: code, type: "EXPENSE", normalBalance: "DEBIT" };
  }

  // Build the list of all accounts for the UI account selector
  const accountList: AccountMeta[] = usedCodes.map(resolveAccount);

  // If accountCode filter is given, validate it exists in our ledger
  if (accountCode && !usedCodes.includes(accountCode)) {
    return NextResponse.json({
      account: resolveAccount(accountCode),
      accounts: accountList,
      rows: [],
      openingBalance: 0,
      closingBalance: 0,
    });
  }

  // Filter entries to the requested account (or all if none specified)
  const filteredEntries = accountCode
    ? allEntries.filter((e) => e.accountCode === accountCode)
    : allEntries;

  // Sort by date (already ordered from query, but double-entry expansion may interleave)
  filteredEntries.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate running balance per-account (or combined if no filter)
  // For debit-normal accounts: balance += debit - credit
  // For credit-normal accounts: balance += credit - debit
  const targetCode = accountCode ?? null;
  const meta = targetCode ? resolveAccount(targetCode) : null;
  const isDebitNormal = !meta || meta.normalBalance === "DEBIT";

  let runningBalance = 0;
  const rows = filteredEntries.map((e) => {
    if (isDebitNormal) {
      runningBalance += e.debit - e.credit;
    } else {
      runningBalance += e.credit - e.debit;
    }
    return {
      date: e.date,
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      balance: runningBalance,
      ref: e.ref,
      accountCode: e.accountCode,
    };
  });

  const closingBalance = runningBalance;

  if (accountCode) {
    return NextResponse.json({
      account: resolveAccount(accountCode),
      accounts: accountList,
      openingBalance: 0,
      closingBalance,
      rows,
    });
  }

  // No account filter: return all entries grouped by account code + the account list
  return NextResponse.json({
    accounts: accountList,
    rows,
    closingBalance,
  });
}
