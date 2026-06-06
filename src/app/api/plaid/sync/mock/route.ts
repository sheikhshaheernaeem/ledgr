import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MOCK_TEMPLATES = [
  // Revenue
  { description: "Stripe Payment - Invoice #INV-{n}", type: "CREDIT", amount: 3500, category: "Revenue", variance: 0.4 },
  { description: "Client Payment - {company}", type: "CREDIT", amount: 2800, category: "Revenue", variance: 0.5 },
  { description: "Consulting Fee", type: "CREDIT", amount: 1500, category: "Revenue", variance: 0.3 },
  { description: "PayPal Transfer", type: "CREDIT", amount: 950, category: "Revenue", variance: 0.6 },
  { description: "ACH Deposit - {company}", type: "CREDIT", amount: 5200, category: "Revenue", variance: 0.4 },
  // Payroll & Benefits
  { description: "Gusto Payroll", type: "DEBIT", amount: 4800, category: "Payroll & Benefits", variance: 0.05 },
  { description: "Health Insurance Premium", type: "DEBIT", amount: 620, category: "Payroll & Benefits", variance: 0.02 },
  // Software
  { description: "AWS Services", type: "DEBIT", amount: 420, category: "Software & Subscriptions", variance: 0.15 },
  { description: "GitHub Teams", type: "DEBIT", amount: 84, category: "Software & Subscriptions", variance: 0 },
  { description: "Figma", type: "DEBIT", amount: 75, category: "Software & Subscriptions", variance: 0 },
  { description: "Notion - Business Plan", type: "DEBIT", amount: 48, category: "Software & Subscriptions", variance: 0 },
  { description: "Slack Pro", type: "DEBIT", amount: 87.5, category: "Software & Subscriptions", variance: 0 },
  { description: "Google Workspace", type: "DEBIT", amount: 144, category: "Software & Subscriptions", variance: 0 },
  // Marketing
  { description: "Google Ads", type: "DEBIT", amount: 750, category: "Marketing & Advertising", variance: 0.3 },
  { description: "Facebook Ads", type: "DEBIT", amount: 380, category: "Marketing & Advertising", variance: 0.4 },
  // Rent & Utilities
  { description: "Office Rent - {month}", type: "DEBIT", amount: 2200, category: "Rent & Utilities", variance: 0 },
  { description: "WeWork Coworking", type: "DEBIT", amount: 650, category: "Rent & Utilities", variance: 0 },
  { description: "Electric Bill", type: "DEBIT", amount: 185, category: "Rent & Utilities", variance: 0.1 },
  { description: "Internet - Business", type: "DEBIT", amount: 120, category: "Rent & Utilities", variance: 0 },
  // Professional
  { description: "Legal Fees - {company}", type: "DEBIT", amount: 1200, category: "Professional Services", variance: 0.5 },
  { description: "Accounting Services", type: "DEBIT", amount: 800, category: "Professional Services", variance: 0.2 },
  // Travel
  { description: "Delta Airlines", type: "DEBIT", amount: 340, category: "Travel & Entertainment", variance: 0.6 },
  { description: "Uber Business", type: "DEBIT", amount: 65, category: "Travel & Entertainment", variance: 0.5 },
  { description: "Hotel - Conference", type: "DEBIT", amount: 420, category: "Travel & Entertainment", variance: 0.4 },
  // Office
  { description: "Amazon Business", type: "DEBIT", amount: 280, category: "Office Supplies", variance: 0.5 },
  { description: "Staples", type: "DEBIT", amount: 95, category: "Office Supplies", variance: 0.4 },
  // Banking
  { description: "Bank Service Charge", type: "DEBIT", amount: 35, category: "Banking & Fees", variance: 0 },
  { description: "Wire Transfer Fee", type: "DEBIT", amount: 25, category: "Banking & Fees", variance: 0 },
];

const COMPANIES = ["Acme Corp", "TechVentures", "Blue Sky LLC", "Meridian Group", "Nova Partners", "Summit Digital"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function renderDesc(template: string, idx: number): string {
  const now = new Date();
  return template
    .replace("{n}", String(1000 + idx))
    .replace("{company}", COMPANIES[idx % COMPANIES.length])
    .replace("{month}", MONTHS[now.getMonth()]);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const bankAccountId: string | null = body.bankAccountId ?? null;

  // Pick a realistic subset of 12-18 transactions spread over last 30 days
  const count = 12 + Math.floor(Math.random() * 7);
  const shuffled = [...MOCK_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, count);

  const now = new Date();
  const syncTag = `DEMO-${Date.now()}`;

  const txData = shuffled.map((t, idx) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const varianceMultiplier = 1 + (Math.random() * t.variance * 2 - t.variance);
    return {
      userId,
      bankAccountId,
      date: new Date(now.getTime() - daysAgo * 86_400_000),
      description: renderDesc(t.description, idx),
      amount: parseFloat((t.amount * varianceMultiplier).toFixed(2)),
      type: t.type,
      category: t.category,
      status: "PENDING" as const,
      confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)),
      bankStatementRef: `${syncTag}-${idx}`,
    };
  });

  await prisma.transaction.createMany({ data: txData });

  return NextResponse.json({
    imported: txData.length,
    demo: true,
    message: "Demo sync complete. Add PLAID_CLIENT_ID + PLAID_SECRET to enable real bank sync.",
  });
}
