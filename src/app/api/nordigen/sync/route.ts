import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const NORDIGEN_BASE = "https://bankaccountdata.gocardless.com/api/v2";

async function getNordigenToken(): Promise<string | null> {
  const id = process.env.NORDIGEN_SECRET_ID;
  const key = process.env.NORDIGEN_SECRET_KEY;
  if (!id || !key) return null;

  const res = await fetch(`${NORDIGEN_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ secret_id: id, secret_key: key }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access as string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { connectionId, bankAccountId } = body as { connectionId: string; bankAccountId?: string };

  const connection = await prisma.plaidConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const token = await getNordigenToken();
  if (!token) {
    // Fall back to mock sync if credentials not set
    const mockRes = await fetch(new URL("/api/plaid/sync/mock", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body: JSON.stringify({ bankAccountId }),
    });
    if (mockRes.ok) {
      const data = await mockRes.json();
      return NextResponse.json({ ...data, provider: "demo" });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }

  // Get accounts from requisition
  const requisitionId = connection.accessToken;
  const reqRes = await fetch(`${NORDIGEN_BASE}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!reqRes.ok) return NextResponse.json({ error: "Could not fetch requisition" }, { status: 502 });
  const requisition = await reqRes.json();

  const accountIds: string[] = requisition.accounts ?? [];
  if (accountIds.length === 0) return NextResponse.json({ imported: 0, message: "No linked accounts found" });

  let totalImported = 0;
  const syncTag = `NORDIGEN-${Date.now()}`;

  for (const accountId of accountIds) {
    // Fetch transactions (last 90 days)
    const txRes = await fetch(`${NORDIGEN_BASE}/accounts/${accountId}/transactions/`, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!txRes.ok) continue;
    const txData = await txRes.json();

    const booked: Array<{
      transactionId?: string;
      bookingDate?: string;
      valueDate?: string;
      transactionAmount?: { amount: string; currency: string };
      creditorName?: string;
      debtorName?: string;
      remittanceInformationUnstructured?: string;
    }> = txData?.transactions?.booked ?? [];

    for (const tx of booked) {
      const ref = tx.transactionId ?? `${accountId}-${tx.bookingDate}-${tx.transactionAmount?.amount}`;
      const exists = await prisma.transaction.findFirst({ where: { bankStatementRef: ref, userId } });
      if (exists) continue;

      const amountRaw = parseFloat(tx.transactionAmount?.amount ?? "0");
      const isCredit = amountRaw >= 0;
      const description =
        tx.creditorName ??
        tx.debtorName ??
        tx.remittanceInformationUnstructured ??
        "Bank Transaction";

      await prisma.transaction.create({
        data: {
          userId,
          bankAccountId: bankAccountId ?? null,
          date: new Date(tx.bookingDate ?? tx.valueDate ?? new Date()),
          description,
          amount: Math.abs(amountRaw),
          type: isCredit ? "CREDIT" : "DEBIT",
          category: "Uncategorized",
          status: "PENDING",
          confidence: 0.0,
          bankStatementRef: `${syncTag}-${ref}`,
        },
      });
      totalImported++;
    }
  }

  // Update last sync time
  await prisma.plaidConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date(), status: "ACTIVE" },
  });

  return NextResponse.json({ imported: totalImported, provider: "nordigen", accounts: accountIds.length });
}
