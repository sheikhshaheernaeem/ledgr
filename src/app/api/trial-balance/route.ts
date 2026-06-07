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

  // Run all data queries in parallel for performance
  const [transactions, bankAccounts, outstandingInvoices, outstandingBills, fixedAssets, accounts] =
    await Promise.all([
      // Transactions (optionally date-filtered)
      prisma.transaction.findMany({
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
      }),
      // Bank accounts — used for real cash balance (overrides transaction-derived cash)
      prisma.bankAccount.findMany({ where: { userId } }),
      // Accounts Receivable: unpaid / partially-paid invoices
      prisma.invoice.findMany({
        where: { userId, status: { in: ["SENT", "OVERDUE", "PARTIAL"] } },
      }),
      // Accounts Payable: unpaid / overdue bills
      prisma.bill.findMany({
        where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
      }),
      // Fixed Assets with their depreciation entries
      prisma.fixedAsset.findMany({
        where: { userId, disposalDate: null },
        include: { depreciationEntries: true },
      }),
      // Chart of accounts
      prisma.chartOfAccount.findMany({
        where: { userId, isActive: true },
        orderBy: { code: "asc" },
      }),
    ]);

  // ── Build ledger from transactions (income statement accounts + transaction-derived cash) ──
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

  // ── Cash (1000): override with real bank account balances ──
  // Using actual balances is more accurate than transaction net flow because
  // opening balances are not journalised in this system.
  const cashBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);
  // Replace whatever the transaction loop computed for cash
  ledger.set("1000", { debit: cashBalance > 0 ? cashBalance : 0, credit: cashBalance < 0 ? Math.abs(cashBalance) : 0 });

  // ── Accounts Receivable (1100): debit balance ──
  const arBalance = outstandingInvoices.reduce((s, inv) => s + Math.max(0, inv.total - inv.amountPaid), 0);
  if (arBalance > 0) {
    ledger.set("1100", { debit: arBalance, credit: 0 });
  }

  // ── Fixed Assets (1500): net book value as debit balance ──
  const fixedAssetsNet = fixedAssets.reduce((s, asset) => {
    const accDepn = asset.depreciationEntries.reduce((d, e) => d + e.amount, 0);
    // Fall back to straight-line computed depreciation if no entries have been posted
    const elapsed = Math.floor(
      (Date.now() - new Date(asset.purchaseDate).getTime()) / (30.44 * 86400000)
    );
    const monthlyDepn =
      asset.usefulLifeMonths > 0
        ? (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths
        : 0;
    const computedDepn = Math.min(elapsed * monthlyDepn, asset.purchaseCost - asset.salvageValue);
    const depn = accDepn > 0 ? accDepn : computedDepn;
    const netValue = asset.purchaseCost - depn;
    return s + Math.max(0, netValue);
  }, 0);
  if (fixedAssetsNet > 0) {
    ledger.set("1500", { debit: fixedAssetsNet, credit: 0 });
  }

  // ── Accounts Payable (2000): credit balance ──
  const apBalance = outstandingBills.reduce((s, bill) => s + Math.max(0, bill.total - bill.amountPaid), 0);
  if (apBalance > 0) {
    ledger.set("2000", { debit: 0, credit: apBalance });
  }

  // ── Equity / Retained Earnings (3000): credit balance (plug) ──
  // Equity = Total Assets - Total Liabilities
  // Assets: cash + AR + fixed assets; Liabilities: AP
  const totalAssets = Math.max(0, cashBalance) + arBalance + fixedAssetsNet;
  const totalLiabilities = apBalance;
  const equity = totalAssets - totalLiabilities;
  if (equity !== 0) {
    ledger.set("3000", {
      debit: equity < 0 ? Math.abs(equity) : 0,
      credit: equity > 0 ? equity : 0,
    });
  }

  // ── Build output rows ──
  const rows: {
    accountId: string;
    code: string;
    name: string;
    type: string;
    normalBalance: string;
    debit: number;
    credit: number;
    net: number;
  }[] = [];

  // First, include rows whose code matches a known chart-of-accounts entry
  for (const a of accounts) {
    if (!ledger.has(a.code)) continue;
    const { debit, credit } = ledger.get(a.code)!;
    rows.push({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      normalBalance: a.normalBalance,
      debit,
      credit,
      net: debit - credit,
    });
  }

  // Then, include synthetic rows for any ledger entries not in the chart of accounts
  const knownCodes = new Set(accounts.map((a) => a.code));
  const SYNTHETIC: Record<string, { name: string; type: string }> = {
    "1000": { name: "Cash & Bank",              type: "ASSET"     },
    "1100": { name: "Accounts Receivable",       type: "ASSET"     },
    "1500": { name: "Fixed Assets (Net)",        type: "ASSET"     },
    "2000": { name: "Accounts Payable",          type: "LIABILITY" },
    "3000": { name: "Retained Earnings / Equity",type: "EQUITY"    },
    "4000": { name: "Revenue",                   type: "REVENUE"   },
    "5000": { name: "Cost of Goods Sold",        type: "EXPENSE"   },
    "6000": { name: "Payroll & Benefits",        type: "EXPENSE"   },
    "6100": { name: "Rent & Utilities",          type: "EXPENSE"   },
    "6200": { name: "Marketing & Advertising",   type: "EXPENSE"   },
    "6300": { name: "Software & Subscriptions",  type: "EXPENSE"   },
    "6400": { name: "Professional Services",     type: "EXPENSE"   },
    "6500": { name: "Insurance",                 type: "EXPENSE"   },
    "6600": { name: "Travel & Meals",            type: "EXPENSE"   },
    "6700": { name: "Depreciation",              type: "EXPENSE"   },
  };

  for (const [code, { debit, credit }] of ledger.entries()) {
    if (knownCodes.has(code)) continue; // already handled above
    const meta = SYNTHETIC[code] ?? { name: code, type: "EXPENSE" };
    const normalBalance =
      meta.type === "ASSET" || meta.type === "EXPENSE" ? "DEBIT" : "CREDIT";
    rows.push({
      accountId: code,
      code,
      name: meta.name,
      type: meta.type,
      normalBalance,
      debit,
      credit,
      net: debit - credit,
    });
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
