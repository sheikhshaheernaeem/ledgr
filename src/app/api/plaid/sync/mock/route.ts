import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MOCK_TRANSACTIONS = [
  { description: "Stripe Payment", type: "CREDIT", amount: 3500.0, category: "Revenue" },
  { description: "AWS Services", type: "DEBIT", amount: 420.5, category: "Software & Subscriptions" },
  { description: "Payroll - Employees", type: "DEBIT", amount: 4800.0, category: "Payroll & Benefits" },
  { description: "Google Ads", type: "DEBIT", amount: 750.0, category: "Marketing & Advertising" },
  { description: "Stripe Payment", type: "CREDIT", amount: 1200.0, category: "Revenue" },
  { description: "Office Rent", type: "DEBIT", amount: 2200.0, category: "Rent & Utilities" },
  { description: "Figma Subscription", type: "DEBIT", amount: 75.0, category: "Software & Subscriptions" },
  { description: "Client Invoice Payment", type: "CREDIT", amount: 5000.0, category: "Revenue" },
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { bankAccountId } = await req.json();

  const now = new Date();
  const txData = MOCK_TRANSACTIONS.map((t, idx) => {
    const daysAgo = Math.floor(Math.random() * 14);
    const variance = 1 + (Math.random() * 0.1 - 0.05);
    return {
      userId,
      bankAccountId: bankAccountId ?? null,
      date: new Date(now.getTime() - daysAgo * 86400000),
      description: t.description,
      amount: parseFloat((t.amount * variance).toFixed(2)),
      type: t.type,
      category: t.category,
      subcategory: null,
      status: "PENDING",
      confidence: 0.9,
      bankStatementRef: `MOCK-SYNC-${Date.now()}-${idx}`,
    };
  });

  await prisma.transaction.createMany({ data: txData });
  return NextResponse.json({ imported: txData.length });
}
