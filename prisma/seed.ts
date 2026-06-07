import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Initialized inside main() so DATABASE_URL is loaded first
let prisma: PrismaClient;
let pwd = "";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const d = (y: number, m: number, day: number) => new Date(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
const due = (base: Date, days: number) => new Date(base.getTime() + days * 86400000);

// ─── Demo accounts ────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    email: "demo@acmetech.com",
    name: "Acme Tech",
    plan: "GROWTH",
    industry: "saas",
  },
  {
    email: "demo@brightretail.com",
    name: "Bright Retail",
    plan: "STARTER",
    industry: "retail",
  },
  {
    email: "demo@mavenagency.com",
    name: "Maven Agency",
    plan: "GROWTH",
    industry: "agency",
  },
  {
    email: "demo@greeneats.com",
    name: "Green Eats",
    plan: "STARTER",
    industry: "restaurant",
  },
];

// ─── Shared chart of accounts ─────────────────────────────────────────────────
function coaData(userId: string) {
  return [
    { code: "1000", name: "Cash & Bank", type: "ASSET", userId },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", userId },
    { code: "1200", name: "Inventory", type: "ASSET", userId },
    { code: "1500", name: "Fixed Assets", type: "ASSET", userId },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", userId },
    { code: "2100", name: "Accrued Liabilities", type: "LIABILITY", userId },
    { code: "3000", name: "Owner Equity", type: "EQUITY", userId },
    { code: "4000", name: "Revenue", type: "REVENUE", userId },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", userId },
    { code: "6000", name: "Payroll & Benefits", type: "EXPENSE", userId },
    { code: "6100", name: "Rent & Utilities", type: "EXPENSE", userId },
    { code: "6200", name: "Marketing & Advertising", type: "EXPENSE", userId },
    { code: "6300", name: "Software & Subscriptions", type: "EXPENSE", userId },
    { code: "6400", name: "Professional Services", type: "EXPENSE", userId },
    { code: "6500", name: "Insurance", type: "EXPENSE", userId },
    { code: "6600", name: "Travel & Meals", type: "EXPENSE", userId },
    { code: "6700", name: "Depreciation", type: "EXPENSE", userId },
  ];
}

// ─── SaaS company data ────────────────────────────────────────────────────────
async function seedSaaS(userId: string) {
  // Bank accounts
  const bank = await prisma.bankAccount.create({
    data: { userId, name: "Chase Business Checking", accountType: "CHECKING", institutionName: "Chase", lastFourDigits: "4821", currency: "USD", currentBalance: 84320.5 },
  });
  await prisma.bankAccount.create({
    data: { userId, name: "Chase Business Savings", accountType: "SAVINGS", institutionName: "Chase", lastFourDigits: "9043", currency: "USD", currentBalance: 120000 },
  });

  // Clients
  const clients = await Promise.all([
    prisma.client.create({ data: { userId, name: "Horizon Logistics", email: "billing@horizonlogistics.com", company: "Horizon Logistics Inc.", phone: "+1 415-555-0101" } }),
    prisma.client.create({ data: { userId, name: "NovaTech Solutions", email: "accounts@novatech.io", company: "NovaTech Solutions LLC", phone: "+1 212-555-0182" } }),
    prisma.client.create({ data: { userId, name: "Pinnacle Retail Group", email: "finance@pinnacleretail.com", company: "Pinnacle Retail Group", phone: "+1 312-555-0147" } }),
    prisma.client.create({ data: { userId, name: "BlueSky Ventures", email: "ops@blueskyvc.com", company: "BlueSky Ventures", phone: "+1 650-555-0193" } }),
  ]);

  // Invoices
  const invoices = [
    { clientIdx: 0, num: "INV-001", issue: d(2026,2,1), status: "PAID", amount: 4800, paidAt: d(2026,2,15) },
    { clientIdx: 1, num: "INV-002", issue: d(2026,2,15), status: "PAID", amount: 3200, paidAt: d(2026,3,1) },
    { clientIdx: 2, num: "INV-003", issue: d(2026,3,1), status: "PAID", amount: 6500, paidAt: d(2026,3,20) },
    { clientIdx: 0, num: "INV-004", issue: d(2026,3,15), status: "PAID", amount: 4800, paidAt: d(2026,4,5) },
    { clientIdx: 3, num: "INV-005", issue: d(2026,4,1), status: "PAID", amount: 9200, paidAt: d(2026,4,18) },
    { clientIdx: 1, num: "INV-006", issue: d(2026,4,15), status: "PAID", amount: 3200, paidAt: d(2026,5,2) },
    { clientIdx: 2, num: "INV-007", issue: d(2026,5,1), status: "PAID", amount: 6500, paidAt: d(2026,5,14) },
    { clientIdx: 0, num: "INV-008", issue: d(2026,5,15), status: "PAID", amount: 4800, paidAt: d(2026,5,28) },
    { clientIdx: 3, num: "INV-009", issue: d(2026,6,1), status: "SENT", amount: 9200, paidAt: null },
    { clientIdx: 1, num: "INV-010", issue: d(2026,6,10), status: "SENT", amount: 3200, paidAt: null },
    { clientIdx: 2, num: "INV-011", issue: d(2026,6,15), status: "DRAFT", amount: 6500, paidAt: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        userId, clientId: clients[inv.clientIdx].id,
        invoiceNumber: inv.num, clientName: clients[inv.clientIdx].name,
        clientEmail: clients[inv.clientIdx].email ?? "",
        issueDate: inv.issue, dueDate: due(inv.issue, 30),
        status: inv.status, subtotal: inv.amount, taxRate: 0,
        taxAmount: 0, total: inv.amount, amountPaid: inv.status === "PAID" ? inv.amount : 0,
        paidAt: inv.paidAt,
        lineItems: { create: [{ description: "Software Subscription – Monthly License", quantity: 1, unitPrice: inv.amount, amount: inv.amount }] },
      },
    });
  }

  // Bills
  const bills = [
    { vendor: "Amazon Web Services", num: "BILL-001", issue: d(2026,2,1), status: "PAID", amount: 1842.3, cat: "Software & Subscriptions", paidAt: d(2026,2,10) },
    { vendor: "WeWork Office Space", num: "BILL-002", issue: d(2026,2,1), status: "PAID", amount: 3200, cat: "Rent & Utilities", paidAt: d(2026,2,5) },
    { vendor: "Gusto Payroll", num: "BILL-003", issue: d(2026,2,15), status: "PAID", amount: 12400, cat: "Payroll & Benefits", paidAt: d(2026,2,15) },
    { vendor: "Google Ads", num: "BILL-004", issue: d(2026,3,1), status: "PAID", amount: 2100, cat: "Marketing & Advertising", paidAt: d(2026,3,8) },
    { vendor: "Amazon Web Services", num: "BILL-005", issue: d(2026,3,1), status: "PAID", amount: 1956.8, cat: "Software & Subscriptions", paidAt: d(2026,3,10) },
    { vendor: "WeWork Office Space", num: "BILL-006", issue: d(2026,3,1), status: "PAID", amount: 3200, cat: "Rent & Utilities", paidAt: d(2026,3,5) },
    { vendor: "Gusto Payroll", num: "BILL-007", issue: d(2026,3,15), status: "PAID", amount: 12400, cat: "Payroll & Benefits", paidAt: d(2026,3,15) },
    { vendor: "Amazon Web Services", num: "BILL-008", issue: d(2026,6,1), status: "PENDING", amount: 2134.6, cat: "Software & Subscriptions", paidAt: null },
    { vendor: "WeWork Office Space", num: "BILL-009", issue: d(2026,6,1), status: "PENDING", amount: 3200, cat: "Rent & Utilities", paidAt: null },
    { vendor: "Gusto Payroll", num: "BILL-010", issue: d(2026,6,15), status: "PENDING", amount: 12400, cat: "Payroll & Benefits", paidAt: null },
  ];
  for (const b of bills) {
    await prisma.bill.create({
      data: {
        userId, billNumber: b.num, vendorName: b.vendor,
        issueDate: b.issue, dueDate: due(b.issue, 30),
        status: b.status, subtotal: b.amount, taxRate: 0, taxAmount: 0,
        total: b.amount, amountPaid: b.status === "PAID" ? b.amount : 0,
        category: b.cat, paidAt: b.paidAt,
        lineItems: { create: [{ description: b.cat, quantity: 1, unitPrice: b.amount, amount: b.amount }] },
      },
    });
  }

  // Transactions (6 months)
  const txns = [
    // Feb
    { date: d(2026,2,1), description: "Client Payment – Horizon Logistics", amount: 4800, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,1), description: "AWS – Cloud Hosting", amount: 1842.3, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,2,1), description: "WeWork – Office Rent", amount: 3200, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,2,15), description: "Client Payment – NovaTech", amount: 3200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,15), description: "Gusto Payroll Run", amount: 12400, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,2,20), description: "Google Workspace", amount: 144, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    // Mar
    { date: d(2026,3,1), description: "Client Payment – Pinnacle Retail", amount: 6500, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,1), description: "AWS – Cloud Hosting", amount: 1956.8, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,3,1), description: "WeWork – Office Rent", amount: 3200, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,3,1), description: "Google Ads Campaign", amount: 2100, type: "DEBIT", category: "Marketing & Advertising", status: "APPROVED" },
    { date: d(2026,3,15), description: "Client Payment – Horizon Logistics", amount: 4800, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,15), description: "Gusto Payroll Run", amount: 12400, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,3,22), description: "GitHub Teams", amount: 84, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    // Apr
    { date: d(2026,4,1), description: "Client Payment – BlueSky Ventures", amount: 9200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,4,1), description: "AWS – Cloud Hosting", amount: 2043.1, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,4,1), description: "WeWork – Office Rent", amount: 3200, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,4,15), description: "Client Payment – NovaTech", amount: 3200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,4,15), description: "Gusto Payroll Run", amount: 12400, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,4,18), description: "Figma Professional", amount: 45, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,4,25), description: "Business Insurance", amount: 380, type: "DEBIT", category: "Insurance", status: "APPROVED" },
    // May
    { date: d(2026,5,1), description: "Client Payment – Pinnacle Retail", amount: 6500, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,1), description: "AWS – Cloud Hosting", amount: 2134.6, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,5,1), description: "WeWork – Office Rent", amount: 3200, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,5,10), description: "Meta Ads Campaign", amount: 1800, type: "DEBIT", category: "Marketing & Advertising", status: "APPROVED" },
    { date: d(2026,5,15), description: "Client Payment – Horizon Logistics", amount: 4800, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,15), description: "Gusto Payroll Run", amount: 12400, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,5,28), description: "Legal – Contract Review", amount: 750, type: "DEBIT", category: "Professional Services", status: "APPROVED" },
    // Jun (pending)
    { date: d(2026,6,1), description: "Client Payment – BlueSky Ventures", amount: 9200, type: "CREDIT", category: "Revenue", status: "PENDING" },
    { date: d(2026,6,1), description: "AWS – Cloud Hosting", amount: 2134.6, type: "DEBIT", category: "Software & Subscriptions", status: "PENDING" },
    { date: d(2026,6,3), description: "WeWork – Office Rent", amount: 3200, type: "DEBIT", category: "Rent & Utilities", status: "PENDING" },
  ];
  await prisma.transaction.createMany({
    data: txns.map((t) => ({ ...t, userId, bankAccountId: bank.id, confidence: t.status === "APPROVED" ? 0.97 : null })),
  });

  // Fixed assets
  await prisma.fixedAsset.createMany({
    data: [
      { userId, name: "MacBook Pro Fleet (5 units)", purchaseDate: d(2025,1,15), purchaseCost: 12500, salvageValue: 1250, usefulLifeMonths: 48, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-001" },
      { userId, name: "Office Furniture & Fittings", purchaseDate: d(2025,3,1), purchaseCost: 8400, salvageValue: 500, usefulLifeMonths: 60, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-002" },
      { userId, name: "Server Equipment", purchaseDate: d(2024,11,1), purchaseCost: 22000, salvageValue: 2000, usefulLifeMonths: 60, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-003" },
    ],
  });

  // Budget
  await prisma.budget.createMany({
    data: [
      { userId, month: 6, year: 2026, category: "Revenue", amount: 30000 },
      { userId, month: 6, year: 2026, category: "Payroll & Benefits", amount: 12400 },
      { userId, month: 6, year: 2026, category: "Rent & Utilities", amount: 3200 },
      { userId, month: 6, year: 2026, category: "Software & Subscriptions", amount: 2500 },
      { userId, month: 6, year: 2026, category: "Marketing & Advertising", amount: 2000 },
    ],
  });

  // Report
  await prisma.report.create({
    data: {
      userId, month: 5, year: 2026, status: "SENT",
      totalIncome: 11300, totalExpenses: 19479.6, netProfit: -8179.6,
      aiSummary: "May 2026 shows a net loss of $8,180 driven by high payroll costs. Revenue of $11,300 was strong from four clients. Consider reviewing payroll structure and scaling revenue efforts to break even by Q3.",
      sentAt: d(2026,6,1),
    },
  });
}

// ─── Retail store data ────────────────────────────────────────────────────────
async function seedRetail(userId: string) {
  const bank = await prisma.bankAccount.create({
    data: { userId, name: "Bank of America Business", accountType: "CHECKING", institutionName: "Bank of America", lastFourDigits: "7732", currency: "USD", currentBalance: 28450.75 },
  });

  const clients = await Promise.all([
    prisma.client.create({ data: { userId, name: "Walk-in Customers", email: "sales@brightretail.com", company: "Point of Sale" } }),
    prisma.client.create({ data: { userId, name: "Shopify Online Store", email: "orders@brightretail.com", company: "Shopify" } }),
    prisma.client.create({ data: { userId, name: "Amazon Marketplace", email: "amazon@brightretail.com", company: "Amazon" } }),
  ]);

  const invoices = [
    { clientIdx: 1, num: "INV-001", issue: d(2026,2,28), status: "PAID", amount: 14320, paidAt: d(2026,3,5) },
    { clientIdx: 2, num: "INV-002", issue: d(2026,3,31), status: "PAID", amount: 9840, paidAt: d(2026,4,7) },
    { clientIdx: 1, num: "INV-003", issue: d(2026,4,30), status: "PAID", amount: 16200, paidAt: d(2026,5,6) },
    { clientIdx: 2, num: "INV-004", issue: d(2026,5,31), status: "SENT", amount: 11560, paidAt: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        userId, clientId: clients[inv.clientIdx].id,
        invoiceNumber: inv.num, clientName: clients[inv.clientIdx].name,
        clientEmail: clients[inv.clientIdx].email ?? "",
        issueDate: inv.issue, dueDate: due(inv.issue, 15),
        status: inv.status, subtotal: inv.amount, taxRate: 8.5,
        taxAmount: inv.amount * 0.085, total: inv.amount * 1.085,
        amountPaid: inv.status === "PAID" ? inv.amount * 1.085 : 0,
        paidAt: inv.paidAt,
        lineItems: { create: [{ description: "Monthly Sales Revenue", quantity: 1, unitPrice: inv.amount, amount: inv.amount }] },
      },
    });
  }

  const bills = [
    { vendor: "Wholesale Supplies Co.", num: "BILL-001", issue: d(2026,2,1), status: "PAID", amount: 8200, cat: "Cost of Goods Sold", paidAt: d(2026,2,10) },
    { vendor: "Shopify Subscription", num: "BILL-002", issue: d(2026,2,1), status: "PAID", amount: 299, cat: "Software & Subscriptions", paidAt: d(2026,2,3) },
    { vendor: "Mall Rent – Unit 14B", num: "BILL-003", issue: d(2026,2,1), status: "PAID", amount: 4500, cat: "Rent & Utilities", paidAt: d(2026,2,1) },
    { vendor: "Staff Wages – February", num: "BILL-004", issue: d(2026,2,28), status: "PAID", amount: 6800, cat: "Payroll & Benefits", paidAt: d(2026,2,28) },
    { vendor: "Wholesale Supplies Co.", num: "BILL-005", issue: d(2026,3,1), status: "PAID", amount: 7600, cat: "Cost of Goods Sold", paidAt: d(2026,3,10) },
    { vendor: "Mall Rent – Unit 14B", num: "BILL-006", issue: d(2026,3,1), status: "PAID", amount: 4500, cat: "Rent & Utilities", paidAt: d(2026,3,1) },
    { vendor: "Staff Wages – March", num: "BILL-007", issue: d(2026,3,31), status: "PAID", amount: 6800, cat: "Payroll & Benefits", paidAt: d(2026,3,31) },
    { vendor: "Wholesale Supplies Co.", num: "BILL-008", issue: d(2026,6,1), status: "PENDING", amount: 9100, cat: "Cost of Goods Sold", paidAt: null },
    { vendor: "Mall Rent – Unit 14B", num: "BILL-009", issue: d(2026,6,1), status: "PENDING", amount: 4500, cat: "Rent & Utilities", paidAt: null },
    { vendor: "Staff Wages – June", num: "BILL-010", issue: d(2026,6,30), status: "PENDING", amount: 6800, cat: "Payroll & Benefits", paidAt: null },
  ];
  for (const b of bills) {
    await prisma.bill.create({
      data: {
        userId, billNumber: b.num, vendorName: b.vendor,
        issueDate: b.issue, dueDate: due(b.issue, 15),
        status: b.status, subtotal: b.amount, taxRate: 0, taxAmount: 0,
        total: b.amount, amountPaid: b.status === "PAID" ? b.amount : 0,
        category: b.cat, paidAt: b.paidAt,
        lineItems: { create: [{ description: b.cat, quantity: 1, unitPrice: b.amount, amount: b.amount }] },
      },
    });
  }

  const txns = [
    { date: d(2026,2,5), description: "Daily POS Sales – Week 1", amount: 3820, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,12), description: "Daily POS Sales – Week 2", amount: 4110, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,1), description: "Wholesale Supplies Co.", amount: 8200, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,2,1), description: "Mall Rent – Unit 14B", amount: 4500, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,2,28), description: "Staff Wages – February", amount: 6800, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,3,7), description: "Shopify Payout March", amount: 9840, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,1), description: "Wholesale Supplies Co.", amount: 7600, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,3,1), description: "Mall Rent – Unit 14B", amount: 4500, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,3,31), description: "Staff Wages – March", amount: 6800, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,4,6), description: "Shopify Payout April", amount: 16200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,4,1), description: "Wholesale Supplies Co.", amount: 8900, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,4,1), description: "Mall Rent – Unit 14B", amount: 4500, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,4,15), description: "Point of Sale Hardware", amount: 1200, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,5,6), description: "Shopify Payout May", amount: 11560, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,1), description: "Wholesale Supplies Co.", amount: 7400, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,5,1), description: "Mall Rent – Unit 14B", amount: 4500, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,5,31), description: "Staff Wages – May", amount: 6800, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,6,3), description: "POS Sales – Week 1 June", amount: 4200, type: "CREDIT", category: "Revenue", status: "PENDING" },
    { date: d(2026,6,1), description: "Wholesale Supplies Co.", amount: 9100, type: "DEBIT", category: "Cost of Goods Sold", status: "PENDING" },
  ];
  await prisma.transaction.createMany({
    data: txns.map((t) => ({ ...t, userId, bankAccountId: bank.id, confidence: t.status === "APPROVED" ? 0.95 : null })),
  });

  await prisma.fixedAsset.createMany({
    data: [
      { userId, name: "Shop Fit-Out & Interior", purchaseDate: d(2024,6,1), purchaseCost: 35000, salvageValue: 2000, usefulLifeMonths: 84, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-001" },
      { userId, name: "POS System & Terminals", purchaseDate: d(2024,6,1), purchaseCost: 4800, salvageValue: 200, usefulLifeMonths: 36, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-002" },
      { userId, name: "CCTV & Security System", purchaseDate: d(2024,7,1), purchaseCost: 2200, salvageValue: 0, usefulLifeMonths: 48, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-003" },
    ],
  });

  await prisma.budget.createMany({
    data: [
      { userId, month: 6, year: 2026, category: "Revenue", amount: 22000 },
      { userId, month: 6, year: 2026, category: "Cost of Goods Sold", amount: 9000 },
      { userId, month: 6, year: 2026, category: "Payroll & Benefits", amount: 6800 },
      { userId, month: 6, year: 2026, category: "Rent & Utilities", amount: 4500 },
    ],
  });

  await prisma.report.create({
    data: {
      userId, month: 5, year: 2026, status: "SENT",
      totalIncome: 11560, totalExpenses: 18700, netProfit: -7140,
      aiSummary: "May 2026 saw $11,560 in revenue against $18,700 in costs. COGS and payroll are the primary cost drivers. Consider negotiating better terms with Wholesale Supplies Co. or exploring higher-margin product lines.",
      sentAt: d(2026,6,1),
    },
  });
}

// ─── Agency data ──────────────────────────────────────────────────────────────
async function seedAgency(userId: string) {
  const bank = await prisma.bankAccount.create({
    data: { userId, name: "Wells Fargo Business", accountType: "CHECKING", institutionName: "Wells Fargo", lastFourDigits: "5519", currency: "USD", currentBalance: 52180.4 },
  });

  const clients = await Promise.all([
    prisma.client.create({ data: { userId, name: "Catalyst Brands", email: "marketing@catalystbrands.com", company: "Catalyst Brands Co.", phone: "+1 310-555-0128" } }),
    prisma.client.create({ data: { userId, name: "Urban Threads", email: "digital@urbanthreads.com", company: "Urban Threads Fashion", phone: "+1 718-555-0165" } }),
    prisma.client.create({ data: { userId, name: "PeakFit Gyms", email: "growth@peakfit.com", company: "PeakFit Holdings", phone: "+1 404-555-0192" } }),
    prisma.client.create({ data: { userId, name: "Meridian Health", email: "comms@meridianhealth.org", company: "Meridian Health System", phone: "+1 617-555-0143" } }),
  ]);

  const invoices = [
    { clientIdx: 0, num: "INV-001", issue: d(2026,2,28), status: "PAID", amount: 8500, paidAt: d(2026,3,10) },
    { clientIdx: 1, num: "INV-002", issue: d(2026,2,28), status: "PAID", amount: 5200, paidAt: d(2026,3,12) },
    { clientIdx: 2, num: "INV-003", issue: d(2026,3,31), status: "PAID", amount: 6400, paidAt: d(2026,4,14) },
    { clientIdx: 0, num: "INV-004", issue: d(2026,3,31), status: "PAID", amount: 8500, paidAt: d(2026,4,10) },
    { clientIdx: 3, num: "INV-005", issue: d(2026,4,30), status: "PAID", amount: 12000, paidAt: d(2026,5,15) },
    { clientIdx: 1, num: "INV-006", issue: d(2026,4,30), status: "PAID", amount: 5200, paidAt: d(2026,5,12) },
    { clientIdx: 0, num: "INV-007", issue: d(2026,5,31), status: "PAID", amount: 8500, paidAt: d(2026,6,5) },
    { clientIdx: 2, num: "INV-008", issue: d(2026,5,31), status: "SENT", amount: 6400, paidAt: null },
    { clientIdx: 3, num: "INV-009", issue: d(2026,6,15), status: "SENT", amount: 12000, paidAt: null },
    { clientIdx: 1, num: "INV-010", issue: d(2026,6,15), status: "DRAFT", amount: 5200, paidAt: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        userId, clientId: clients[inv.clientIdx].id,
        invoiceNumber: inv.num, clientName: clients[inv.clientIdx].name,
        clientEmail: clients[inv.clientIdx].email ?? "",
        issueDate: inv.issue, dueDate: due(inv.issue, 30),
        status: inv.status, subtotal: inv.amount, taxRate: 0,
        taxAmount: 0, total: inv.amount, amountPaid: inv.status === "PAID" ? inv.amount : 0,
        paidAt: inv.paidAt,
        lineItems: { create: [{ description: "Digital Marketing Retainer", quantity: 1, unitPrice: inv.amount, amount: inv.amount }] },
      },
    });
  }

  const bills = [
    { vendor: "WeWork – Creative Studio", num: "BILL-001", issue: d(2026,2,1), status: "PAID", amount: 2800, cat: "Rent & Utilities", paidAt: d(2026,2,1) },
    { vendor: "Contractor Fees – Designers", num: "BILL-002", issue: d(2026,2,28), status: "PAID", amount: 4200, cat: "Professional Services", paidAt: d(2026,2,28) },
    { vendor: "Adobe Creative Cloud", num: "BILL-003", issue: d(2026,2,1), status: "PAID", amount: 599, cat: "Software & Subscriptions", paidAt: d(2026,2,3) },
    { vendor: "Contractor Fees – Developers", num: "BILL-004", issue: d(2026,3,31), status: "PAID", amount: 5800, cat: "Professional Services", paidAt: d(2026,3,31) },
    { vendor: "WeWork – Creative Studio", num: "BILL-005", issue: d(2026,3,1), status: "PAID", amount: 2800, cat: "Rent & Utilities", paidAt: d(2026,3,1) },
    { vendor: "Media Buy – Q2 Campaign", num: "BILL-006", issue: d(2026,4,1), status: "PAID", amount: 8400, cat: "Marketing & Advertising", paidAt: d(2026,4,5) },
    { vendor: "WeWork – Creative Studio", num: "BILL-007", issue: d(2026,6,1), status: "PENDING", amount: 2800, cat: "Rent & Utilities", paidAt: null },
    { vendor: "Contractor Fees – June", num: "BILL-008", issue: d(2026,6,30), status: "PENDING", amount: 6200, cat: "Professional Services", paidAt: null },
  ];
  for (const b of bills) {
    await prisma.bill.create({
      data: {
        userId, billNumber: b.num, vendorName: b.vendor,
        issueDate: b.issue, dueDate: due(b.issue, 30),
        status: b.status, subtotal: b.amount, taxRate: 0, taxAmount: 0,
        total: b.amount, amountPaid: b.status === "PAID" ? b.amount : 0,
        category: b.cat, paidAt: b.paidAt,
        lineItems: { create: [{ description: b.cat, quantity: 1, unitPrice: b.amount, amount: b.amount }] },
      },
    });
  }

  const txns = [
    { date: d(2026,2,10), description: "Catalyst Brands – Retainer", amount: 8500, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,12), description: "Urban Threads – Retainer", amount: 5200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,1), description: "WeWork Creative Studio", amount: 2800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,2,28), description: "Contractor Fees – Designers", amount: 4200, type: "DEBIT", category: "Professional Services", status: "APPROVED" },
    { date: d(2026,3,10), description: "Catalyst Brands – Retainer", amount: 8500, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,14), description: "PeakFit Gyms – Project", amount: 6400, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,1), description: "WeWork Creative Studio", amount: 2800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,3,31), description: "Contractor Fees – Developers", amount: 5800, type: "DEBIT", category: "Professional Services", status: "APPROVED" },
    { date: d(2026,4,5), description: "Media Buy – Q2", amount: 8400, type: "DEBIT", category: "Marketing & Advertising", status: "APPROVED" },
    { date: d(2026,4,15), description: "Meridian Health – Project Start", amount: 12000, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,4,12), description: "Urban Threads – Retainer", amount: 5200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,5), description: "Catalyst Brands – Retainer", amount: 8500, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,1), description: "WeWork Creative Studio", amount: 2800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,5,20), description: "Adobe Creative Cloud", amount: 599, type: "DEBIT", category: "Software & Subscriptions", status: "APPROVED" },
    { date: d(2026,6,5), description: "Catalyst Brands – Retainer", amount: 8500, type: "CREDIT", category: "Revenue", status: "PENDING" },
    { date: d(2026,6,1), description: "WeWork Creative Studio", amount: 2800, type: "DEBIT", category: "Rent & Utilities", status: "PENDING" },
  ];
  await prisma.transaction.createMany({
    data: txns.map((t) => ({ ...t, userId, bankAccountId: bank.id, confidence: t.status === "APPROVED" ? 0.96 : null })),
  });

  await prisma.fixedAsset.createMany({
    data: [
      { userId, name: "iMac Workstations (3 units)", purchaseDate: d(2025,2,1), purchaseCost: 9600, salvageValue: 600, usefulLifeMonths: 48, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-001" },
      { userId, name: "Camera & Video Equipment", purchaseDate: d(2025,4,15), purchaseCost: 14200, salvageValue: 1000, usefulLifeMonths: 60, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-002" },
    ],
  });

  await prisma.budget.createMany({
    data: [
      { userId, month: 6, year: 2026, category: "Revenue", amount: 28000 },
      { userId, month: 6, year: 2026, category: "Professional Services", amount: 6200 },
      { userId, month: 6, year: 2026, category: "Rent & Utilities", amount: 2800 },
      { userId, month: 6, year: 2026, category: "Software & Subscriptions", amount: 800 },
    ],
  });

  await prisma.report.create({
    data: {
      userId, month: 5, year: 2026, status: "SENT",
      totalIncome: 8500, totalExpenses: 3399, netProfit: 5101,
      aiSummary: "May 2026 was profitable with $5,101 net profit on $8,500 revenue. Contractor costs remained controlled. Two large invoices (Meridian Health $12K, PeakFit $6.4K) are outstanding for June — follow up to ensure timely collection.",
      sentAt: d(2026,6,1),
    },
  });
}

// ─── Restaurant data ──────────────────────────────────────────────────────────
async function seedRestaurant(userId: string) {
  const bank = await prisma.bankAccount.create({
    data: { userId, name: "TD Business Checking", accountType: "CHECKING", institutionName: "TD Bank", lastFourDigits: "2284", currency: "USD", currentBalance: 18640.3 },
  });

  const clients = await Promise.all([
    prisma.client.create({ data: { userId, name: "DoorDash", email: "restaurant@doordash.com", company: "DoorDash Inc." } }),
    prisma.client.create({ data: { userId, name: "Uber Eats", email: "restaurant@ubereats.com", company: "Uber Eats" } }),
    prisma.client.create({ data: { userId, name: "Catering – Corporate Events", email: "catering@greeneats.com", company: "Green Eats Catering" } }),
  ]);

  const invoices = [
    { clientIdx: 0, num: "INV-001", issue: d(2026,2,28), status: "PAID", amount: 6840, paidAt: d(2026,3,7) },
    { clientIdx: 1, num: "INV-002", issue: d(2026,2,28), status: "PAID", amount: 4120, paidAt: d(2026,3,7) },
    { clientIdx: 2, num: "INV-003", issue: d(2026,3,15), status: "PAID", amount: 3200, paidAt: d(2026,3,20) },
    { clientIdx: 0, num: "INV-004", issue: d(2026,3,31), status: "PAID", amount: 7240, paidAt: d(2026,4,7) },
    { clientIdx: 1, num: "INV-005", issue: d(2026,4,30), status: "PAID", amount: 4560, paidAt: d(2026,5,7) },
    { clientIdx: 0, num: "INV-006", issue: d(2026,5,31), status: "SENT", amount: 7890, paidAt: null },
    { clientIdx: 2, num: "INV-007", issue: d(2026,6,10), status: "SENT", amount: 4800, paidAt: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        userId, clientId: clients[inv.clientIdx].id,
        invoiceNumber: inv.num, clientName: clients[inv.clientIdx].name,
        clientEmail: clients[inv.clientIdx].email ?? "",
        issueDate: inv.issue, dueDate: due(inv.issue, 7),
        status: inv.status, subtotal: inv.amount, taxRate: 0,
        taxAmount: 0, total: inv.amount, amountPaid: inv.status === "PAID" ? inv.amount : 0,
        paidAt: inv.paidAt,
        lineItems: { create: [{ description: "Food & Beverage Sales", quantity: 1, unitPrice: inv.amount, amount: inv.amount }] },
      },
    });
  }

  const bills = [
    { vendor: "Metro Food Distributors", num: "BILL-001", issue: d(2026,2,1), status: "PAID", amount: 4200, cat: "Cost of Goods Sold", paidAt: d(2026,2,5) },
    { vendor: "Restaurant Lease – Main St", num: "BILL-002", issue: d(2026,2,1), status: "PAID", amount: 3800, cat: "Rent & Utilities", paidAt: d(2026,2,1) },
    { vendor: "Staff Wages – February", num: "BILL-003", issue: d(2026,2,28), status: "PAID", amount: 5600, cat: "Payroll & Benefits", paidAt: d(2026,2,28) },
    { vendor: "Electricity & Gas Bill", num: "BILL-004", issue: d(2026,2,20), status: "PAID", amount: 680, cat: "Rent & Utilities", paidAt: d(2026,2,22) },
    { vendor: "Metro Food Distributors", num: "BILL-005", issue: d(2026,3,1), status: "PAID", amount: 4600, cat: "Cost of Goods Sold", paidAt: d(2026,3,5) },
    { vendor: "Restaurant Lease – Main St", num: "BILL-006", issue: d(2026,3,1), status: "PAID", amount: 3800, cat: "Rent & Utilities", paidAt: d(2026,3,1) },
    { vendor: "Staff Wages – March", num: "BILL-007", issue: d(2026,3,31), status: "PAID", amount: 5600, cat: "Payroll & Benefits", paidAt: d(2026,3,31) },
    { vendor: "Metro Food Distributors", num: "BILL-008", issue: d(2026,6,1), status: "PENDING", amount: 5100, cat: "Cost of Goods Sold", paidAt: null },
    { vendor: "Restaurant Lease – Main St", num: "BILL-009", issue: d(2026,6,1), status: "PENDING", amount: 3800, cat: "Rent & Utilities", paidAt: null },
    { vendor: "Staff Wages – June", num: "BILL-010", issue: d(2026,6,30), status: "PENDING", amount: 5600, cat: "Payroll & Benefits", paidAt: null },
  ];
  for (const b of bills) {
    await prisma.bill.create({
      data: {
        userId, billNumber: b.num, vendorName: b.vendor,
        issueDate: b.issue, dueDate: due(b.issue, 7),
        status: b.status, subtotal: b.amount, taxRate: 0, taxAmount: 0,
        total: b.amount, amountPaid: b.status === "PAID" ? b.amount : 0,
        category: b.cat, paidAt: b.paidAt,
        lineItems: { create: [{ description: b.cat, quantity: 1, unitPrice: b.amount, amount: b.amount }] },
      },
    });
  }

  const txns = [
    { date: d(2026,2,7), description: "DoorDash Payout – February", amount: 6840, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,7), description: "Uber Eats Payout – February", amount: 4120, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,2,5), description: "Metro Food Distributors", amount: 4200, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,2,1), description: "Restaurant Lease – Main St", amount: 3800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,2,22), description: "Electricity & Gas", amount: 680, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,2,28), description: "Staff Wages – February", amount: 5600, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,3,7), description: "DoorDash Payout – March", amount: 7240, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,7), description: "Catering – Corporate Event", amount: 3200, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,3,5), description: "Metro Food Distributors", amount: 4600, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,3,1), description: "Restaurant Lease – Main St", amount: 3800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,3,31), description: "Staff Wages – March", amount: 5600, type: "DEBIT", category: "Payroll & Benefits", status: "APPROVED" },
    { date: d(2026,4,7), description: "DoorDash Payout – April", amount: 7240, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,4,1), description: "Metro Food Distributors", amount: 4800, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,4,1), description: "Restaurant Lease – Main St", amount: 3800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,5,7), description: "DoorDash Payout – May", amount: 7890, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,7), description: "Uber Eats Payout – May", amount: 4560, type: "CREDIT", category: "Revenue", status: "APPROVED" },
    { date: d(2026,5,1), description: "Metro Food Distributors", amount: 4900, type: "DEBIT", category: "Cost of Goods Sold", status: "APPROVED" },
    { date: d(2026,5,1), description: "Restaurant Lease – Main St", amount: 3800, type: "DEBIT", category: "Rent & Utilities", status: "APPROVED" },
    { date: d(2026,6,3), description: "DoorDash Payout – Week 1", amount: 2100, type: "CREDIT", category: "Revenue", status: "PENDING" },
    { date: d(2026,6,1), description: "Metro Food Distributors", amount: 5100, type: "DEBIT", category: "Cost of Goods Sold", status: "PENDING" },
  ];
  await prisma.transaction.createMany({
    data: txns.map((t) => ({ ...t, userId, bankAccountId: bank.id, confidence: t.status === "APPROVED" ? 0.95 : null })),
  });

  await prisma.fixedAsset.createMany({
    data: [
      { userId, name: "Commercial Kitchen Equipment", purchaseDate: d(2024,3,1), purchaseCost: 28000, salvageValue: 2000, usefulLifeMonths: 120, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-001" },
      { userId, name: "Restaurant Fit-Out & Décor", purchaseDate: d(2024,3,1), purchaseCost: 18000, salvageValue: 0, usefulLifeMonths: 84, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-002" },
      { userId, name: "POS & Ordering Tablets", purchaseDate: d(2024,4,1), purchaseCost: 3200, salvageValue: 0, usefulLifeMonths: 36, depreciationMethod: "STRAIGHT_LINE", assetNumber: "FA-003" },
    ],
  });

  await prisma.budget.createMany({
    data: [
      { userId, month: 6, year: 2026, category: "Revenue", amount: 16000 },
      { userId, month: 6, year: 2026, category: "Cost of Goods Sold", amount: 5100 },
      { userId, month: 6, year: 2026, category: "Payroll & Benefits", amount: 5600 },
      { userId, month: 6, year: 2026, category: "Rent & Utilities", amount: 4500 },
    ],
  });

  await prisma.report.create({
    data: {
      userId, month: 5, year: 2026, status: "SENT",
      totalIncome: 12450, totalExpenses: 8700, netProfit: 3750,
      aiSummary: "May 2026 was a solid month with $3,750 net profit. DoorDash and Uber Eats combined for $12,450 in revenue. Food costs at 39% of revenue are within target. Staff wages are the largest expense — consider optimising shift scheduling during off-peak hours.",
      sentAt: d(2026,6,1),
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("DB URL:", process.env.DATABASE_URL?.slice(0, 40));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  pwd = await bcrypt.hash("demo1234", 12);
  console.log("🌱 Seeding 4 demo accounts...\n");

  // Remove existing demo accounts only
  const demoEmails = ACCOUNTS.map((a) => a.email).concat(["admin@ledgr.app"]);
  await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });

  // Admin
  await prisma.user.create({
    data: { email: "admin@ledgr.app", name: "Ledgr Admin", password: pwd, role: "ADMIN", emailVerified: true },
  });

  const seedFns: Record<string, (uid: string) => Promise<void>> = {
    saas: seedSaaS,
    retail: seedRetail,
    agency: seedAgency,
    restaurant: seedRestaurant,
  };

  for (const acct of ACCOUNTS) {
    console.log(`  Creating ${acct.name} (${acct.email})...`);
    const user = await prisma.user.create({
      data: {
        email: acct.email,
        name: acct.name,
        password: pwd,
        role: "CLIENT",
        emailVerified: true,
        subscription: { create: { plan: acct.plan, status: "ACTIVE" } },
      },
    });

    await prisma.chartOfAccount.createMany({ data: coaData(user.id) });
    await seedFns[acct.industry](user.id);
    console.log(`  ✓ ${acct.name} seeded`);
  }

  console.log("\n✅ All demo accounts ready!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Password for all accounts: demo1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  1. SaaS Company     → demo@acmetech.com");
  console.log("  2. Retail Store     → demo@brightretail.com");
  console.log("  3. Marketing Agency → demo@mavenagency.com");
  console.log("  4. Restaurant       → demo@greeneats.com");
  console.log("  5. Admin            → admin@ledgr.app");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
