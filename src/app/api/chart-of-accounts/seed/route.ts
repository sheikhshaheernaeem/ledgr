import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SEED_ACCOUNTS = [
  // Assets
  { code: "1000", name: "Cash and Cash Equivalents", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1200", name: "Inventory", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1300", name: "Prepaid Expenses", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1500", name: "Fixed Assets", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1600", name: "Accumulated Depreciation", type: "ASSET", normalBalance: "CREDIT" },
  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2100", name: "Accrued Liabilities", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2200", name: "Short-term Loans", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2500", name: "Long-term Debt", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2600", name: "Deferred Revenue", type: "LIABILITY", normalBalance: "CREDIT" },
  // Equity
  { code: "3000", name: "Owner's Equity", type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3200", name: "Owner's Draw", type: "EQUITY", normalBalance: "DEBIT" },
  // Revenue
  { code: "4000", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4100", name: "Service Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4200", name: "Other Income", type: "REVENUE", normalBalance: "CREDIT" },
  // Expenses
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5100", name: "Salaries & Wages", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5200", name: "Rent & Utilities", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5300", name: "Marketing & Advertising", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5400", name: "Professional Services", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5500", name: "Office Supplies", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5600", name: "Depreciation Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5700", name: "Interest Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5800", name: "Taxes", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5900", name: "Other Expenses", type: "EXPENSE", normalBalance: "DEBIT" },
];

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // Check if user already has accounts
  const existingCount = await prisma.chartOfAccount.count({ where: { userId } });
  if (existingCount > 0) {
    return NextResponse.json({ error: "Chart of accounts already exists", seeded: 0 }, { status: 409 });
  }

  const created = await prisma.chartOfAccount.createMany({
    data: SEED_ACCOUNTS.map((a) => ({ ...a, userId, isSystem: true })),
    skipDuplicates: true,
  });

  return NextResponse.json({ seeded: created.count });
}
