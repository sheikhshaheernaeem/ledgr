import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PLAID_BASE = `https://${process.env.PLAID_ENV ?? "sandbox"}.plaid.com`;

// Map common Plaid category strings to Ledgr categories
function mapPlaidCategory(plaidCategories: string[] | null | undefined): string {
  if (!plaidCategories || plaidCategories.length === 0) return "Uncategorized";
  const top = plaidCategories[0].toLowerCase();
  if (top.includes("payroll") || top.includes("salary")) return "Payroll & Benefits";
  if (top.includes("software") || top.includes("subscription") || top.includes("saas"))
    return "Software & Subscriptions";
  if (top.includes("food") || top.includes("restaurant") || top.includes("dining"))
    return "Meals & Entertainment";
  if (top.includes("travel") || top.includes("airline") || top.includes("hotel"))
    return "Travel";
  if (top.includes("rent") || top.includes("utilities") || top.includes("electric"))
    return "Rent & Utilities";
  if (top.includes("marketing") || top.includes("advertising"))
    return "Marketing & Advertising";
  if (top.includes("transfer") || top.includes("payment") || top.includes("deposit"))
    return "Revenue";
  if (top.includes("tax")) return "Taxes & Licenses";
  if (top.includes("office") || top.includes("supplies")) return "Office & Admin";
  return plaidCategories[0];
}

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

async function runMockSync(
  connectionId: string,
  bankAccountId: string,
  userId: string
): Promise<number> {
  const now = new Date();
  const txData = MOCK_TRANSACTIONS.map((template, idx) => {
    const daysAgo = Math.floor(Math.random() * 14);
    const variance = 1 + (Math.random() * 0.1 - 0.05);
    return {
      userId,
      bankAccountId,
      date: new Date(now.getTime() - daysAgo * 86400000),
      description: template.description,
      amount: parseFloat((template.amount * variance).toFixed(2)),
      type: template.type,
      category: template.category,
      subcategory: null as string | null,
      status: "PENDING",
      confidence: 0.9,
      bankStatementRef: `MOCK-${connectionId}-${Date.now()}-${idx}`,
    };
  });

  await prisma.transaction.createMany({ data: txData });
  return txData.length;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id as string;

  const connection = await prisma.plaidConnection.findFirst({
    where: { id, userId },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { userId, plaidAccountId: connection.id },
  });

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const now = new Date();

  // Demo/mock mode — no real Plaid credentials
  if (!clientId || !secret) {
    const imported = await runMockSync(connection.id, bankAccount.id, userId);
    await prisma.plaidConnection.update({ where: { id }, data: { lastSyncAt: now } });
    return NextResponse.json({ imported });
  }

  // Real Plaid sync
  const endDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const startDateObj = connection.lastSyncAt
    ? new Date(connection.lastSyncAt)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = startDateObj.toISOString().split("T")[0];

  const res = await fetch(`${PLAID_BASE}/transactions/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      access_token: connection.accessToken,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Plaid transactions/get error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions from Plaid" },
      { status: 502 }
    );
  }

  const plaidData = await res.json();
  const plaidTransactions: Array<{
    transaction_id: string;
    amount: number;
    date: string;
    name: string;
    category: string[] | null;
  }> = plaidData.transactions ?? [];

  if (plaidTransactions.length === 0) {
    await prisma.plaidConnection.update({ where: { id }, data: { lastSyncAt: now } });
    return NextResponse.json({ imported: 0 });
  }

  // Find already-imported refs to skip duplicates
  const existingRefs = await prisma.transaction.findMany({
    where: {
      userId,
      bankStatementRef: { in: plaidTransactions.map((t) => t.transaction_id) },
    },
    select: { bankStatementRef: true },
  });
  const existingRefSet = new Set(existingRefs.map((t) => t.bankStatementRef));

  const newTransactions = plaidTransactions
    .filter((t) => !existingRefSet.has(t.transaction_id))
    .map((t) => ({
      userId,
      bankAccountId: bankAccount.id,
      // Plaid: positive amount = money leaving account (debit), negative = money coming in (credit)
      type: t.amount > 0 ? "DEBIT" : "CREDIT",
      amount: Math.abs(t.amount),
      date: new Date(t.date),
      description: t.name,
      category: mapPlaidCategory(t.category),
      subcategory: null as string | null,
      status: "PENDING",
      confidence: 0.9,
      bankStatementRef: t.transaction_id,
    }));

  if (newTransactions.length > 0) {
    await prisma.transaction.createMany({ data: newTransactions });
  }

  await prisma.plaidConnection.update({ where: { id }, data: { lastSyncAt: now } });

  return NextResponse.json({ imported: newTransactions.length });
}
