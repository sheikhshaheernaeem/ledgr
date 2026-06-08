import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SEED_ACCOUNTS = [
  // ── Current Assets ──────────────────────────────────────────────
  { code: "1010", name: "Cash in Hand",              type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1020", name: "Petty Cash",                type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1030", name: "Bank Account - Primary",    type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1040", name: "Bank Account - Secondary",  type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1100", name: "Accounts Receivable",       type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1200", name: "Inventory",                 type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1300", name: "Prepaid Expenses",          type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1350", name: "Input Tax Recoverable",     type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  { code: "1400", name: "Other Current Assets",      type: "ASSET", subtype: "Current Asset",     normalBalance: "DEBIT" },
  // ── Non-Current Assets ──────────────────────────────────────────
  { code: "1500", name: "Property & Equipment",      type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1510", name: "Machinery & Equipment",     type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1520", name: "Furniture & Fixtures",      type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1530", name: "Vehicles",                  type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1540", name: "Computer Equipment",        type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1600", name: "Accumulated Depreciation",  type: "ASSET", subtype: "Non-Current Asset", normalBalance: "CREDIT" },
  { code: "1700", name: "Intangible Assets",         type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  { code: "1800", name: "Long-term Investments",     type: "ASSET", subtype: "Non-Current Asset", normalBalance: "DEBIT" },
  // ── Current Liabilities ─────────────────────────────────────────
  { code: "2000", name: "Accounts Payable",          type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2100", name: "Accrued Liabilities",       type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2150", name: "Sales Tax Payable",         type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2160", name: "Income Tax Payable",        type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2200", name: "Short-term Loans",          type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2300", name: "Salaries Payable",          type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  { code: "2400", name: "Deferred Revenue",          type: "LIABILITY", subtype: "Current Liability",     normalBalance: "CREDIT" },
  // ── Non-Current Liabilities ─────────────────────────────────────
  { code: "2500", name: "Long-term Debt",            type: "LIABILITY", subtype: "Non-Current Liability", normalBalance: "CREDIT" },
  { code: "2600", name: "Loan Payable",              type: "LIABILITY", subtype: "Non-Current Liability", normalBalance: "CREDIT" },
  // ── Equity ─────────────────────────────────────────────────────
  { code: "3000", name: "Owner's Equity",            type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3100", name: "Retained Earnings",         type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3200", name: "Owner's Draw",              type: "EQUITY", normalBalance: "DEBIT" },
  { code: "3300", name: "Share Capital",             type: "EQUITY", normalBalance: "CREDIT" },
  // ── Revenue ────────────────────────────────────────────────────
  { code: "4000", name: "Sales Revenue",             type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4100", name: "Service Revenue",           type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4200", name: "Other Income",              type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4300", name: "Interest Income",           type: "REVENUE", normalBalance: "CREDIT" },
  // ── Expenses ───────────────────────────────────────────────────
  { code: "5000", name: "Cost of Goods Sold",        type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5100", name: "Salaries & Wages",          type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5200", name: "Rent & Utilities",          type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5300", name: "Marketing & Advertising",   type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5400", name: "Professional Services",     type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5500", name: "Office Supplies",           type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5600", name: "Depreciation Expense",      type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5700", name: "Interest Expense",          type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5800", name: "Taxes & Levies",            type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5900", name: "Travel & Entertainment",    type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5950", name: "Other Expenses",            type: "EXPENSE", normalBalance: "DEBIT" },
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
