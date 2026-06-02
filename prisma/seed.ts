import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_TRANSACTIONS = [
  // May 2026
  { date: new Date("2026-05-01"), description: "Stripe Payment - Client A", amount: 4500, type: "CREDIT", category: "Revenue", subcategory: "Stripe payments", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-03"), description: "AWS - Cloud Hosting", amount: 342.5, type: "DEBIT", category: "Software & Subscriptions", subcategory: "AWS hosting", confidence: 0.96, status: "APPROVED" },
  { date: new Date("2026-05-05"), description: "Office Rent - May", amount: 1800, type: "DEBIT", category: "Rent & Utilities", subcategory: "Office rent", confidence: 0.99, status: "APPROVED" },
  { date: new Date("2026-05-07"), description: "Stripe Payment - Client B", amount: 2200, type: "CREDIT", category: "Revenue", subcategory: "Stripe payments", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-10"), description: "Meta Ads Campaign", amount: 650, type: "DEBIT", category: "Marketing & Advertising", subcategory: "Meta Ads", confidence: 0.94, status: "APPROVED" },
  { date: new Date("2026-05-12"), description: "Payroll - May W1", amount: 3200, type: "DEBIT", category: "Payroll & Benefits", subcategory: "Salary", confidence: 0.99, status: "APPROVED" },
  { date: new Date("2026-05-14"), description: "Google Workspace", amount: 72, type: "DEBIT", category: "Software & Subscriptions", subcategory: "Google Workspace", confidence: 0.98, status: "APPROVED" },
  { date: new Date("2026-05-15"), description: "Stripe Payment - Client C", amount: 1800, type: "CREDIT", category: "Revenue", subcategory: "Stripe payments", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-18"), description: "Slack Premium", amount: 87.5, type: "DEBIT", category: "Software & Subscriptions", subcategory: "Slack", confidence: 0.98, status: "APPROVED" },
  { date: new Date("2026-05-20"), description: "Legal Consultation - Contracts", amount: 450, type: "DEBIT", category: "Professional Services", subcategory: "Legal fees", confidence: 0.88, status: "APPROVED" },
  { date: new Date("2026-05-22"), description: "Stripe Payment - Client D", amount: 3100, type: "CREDIT", category: "Revenue", subcategory: "Stripe payments", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-25"), description: "Internet Bill", amount: 89.99, type: "DEBIT", category: "Rent & Utilities", subcategory: "Internet", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-26"), description: "Payroll - May W2", amount: 3200, type: "DEBIT", category: "Payroll & Benefits", subcategory: "Salary", confidence: 0.99, status: "APPROVED" },
  { date: new Date("2026-05-28"), description: "GitHub Team", amount: 48, type: "DEBIT", category: "Software & Subscriptions", subcategory: "GitHub", confidence: 0.97, status: "APPROVED" },
  { date: new Date("2026-05-30"), description: "Business Insurance - Monthly", amount: 280, type: "DEBIT", category: "Insurance", subcategory: "Business insurance", confidence: 0.95, status: "APPROVED" },
  // June 2026 (pending AI categorization)
  { date: new Date("2026-06-01"), description: "Stripe Payment - Client A", amount: 4500, type: "CREDIT", category: null, subcategory: null, confidence: null, status: "PENDING" },
  { date: new Date("2026-06-02"), description: "AWS - Cloud Hosting", amount: 358.2, type: "DEBIT", category: null, subcategory: null, confidence: null, status: "PENDING" },
  { date: new Date("2026-06-03"), description: "Office Rent - June", amount: 1800, type: "DEBIT", category: null, subcategory: null, confidence: null, status: "PENDING" },
  { date: new Date("2026-06-04"), description: "Stripe Payment - Client B", amount: 2800, type: "CREDIT", category: null, subcategory: null, confidence: null, status: "PENDING" },
  { date: new Date("2026-06-05"), description: "Figma Professional", amount: 45, type: "DEBIT", category: null, subcategory: null, confidence: null, status: "PENDING" },
];

async function main() {
  console.log("🌱 Seeding demo data...");

  await prisma.transaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@ledgr.app",
      name: "Ledgr Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "demo@acmeshop.com",
      name: "Acme Shop",
      password: hashedPassword,
      role: "CLIENT",
      subscription: {
        create: { plan: "GROWTH", status: "ACTIVE" },
      },
    },
  });

  await prisma.transaction.createMany({
    data: DEMO_TRANSACTIONS.map((t) => ({
      ...t,
      userId: client.id,
    })),
  });

  const mayTransactions = DEMO_TRANSACTIONS.filter(
    (t) => t.date.getMonth() === 4 && t.status === "APPROVED"
  );

  const totalIncome = mayTransactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = mayTransactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);

  await prisma.report.create({
    data: {
      userId: client.id,
      month: 5,
      year: 2026,
      status: "SENT",
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      aiSummary:
        "May 2026 was a strong month with $3,461 net profit. Revenue held steady at $11,600 while Payroll & Benefits remained your largest cost at $6,400. Consider reviewing your marketing spend — $650 on Meta Ads generated solid returns this month.",
      sentAt: new Date("2026-06-05"),
    },
  });

  console.log("✅ Seeded successfully!");
  console.log("");
  console.log("Demo accounts:");
  console.log("  Client  → demo@acmeshop.com   / demo1234");
  console.log("  Admin   → admin@ledgr.app     / demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
