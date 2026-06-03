import { NextResponse } from "next/server";
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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const connection = await prisma.plaidConnection.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Find the associated bank account
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { userId: session.user.id, plaidAccountId: connection.id },
  });

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  const now = new Date();

  // Generate 8 realistic mock transactions with dates in the last 7 days
  const txData = MOCK_TRANSACTIONS.map((template, idx) => {
    const daysAgo = Math.floor(Math.random() * 7);
    const txDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    // Slight amount variation
    const amountVariance = 1 + (Math.random() * 0.1 - 0.05);
    return {
      userId: session.user!.id as string,
      bankAccountId: bankAccount.id,
      date: txDate,
      description: template.description,
      amount: parseFloat((template.amount * amountVariance).toFixed(2)),
      type: template.type,
      category: template.category,
      subcategory: null,
      status: "PENDING",
      confidence: 0.9,
      bankStatementRef: `PLAID-${connection.id}-${idx + 1}`,
    };
  });

  await prisma.transaction.createMany({ data: txData });

  await prisma.plaidConnection.update({
    where: { id },
    data: { lastSyncAt: now },
  });

  return NextResponse.json({ imported: txData.length });
}
