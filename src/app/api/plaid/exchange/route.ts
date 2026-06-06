import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { randomUUID } from "crypto";

const PLAID_BASE = `https://${process.env.PLAID_ENV ?? "sandbox"}.plaid.com`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { publicToken, institutionId, institutionName, accountId } = body as {
    publicToken: string;
    institutionId: string;
    institutionName: string;
    accountId?: string;
  };

  if (!institutionId || !institutionName) {
    return NextResponse.json(
      { error: "institutionId and institutionName are required" },
      { status: 400 }
    );
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  let accessToken: string;
  let itemId: string;

  if (!clientId || !secret || publicToken === "demo-public-token") {
    // Demo mode — generate mock tokens
    accessToken = randomUUID();
    itemId = randomUUID();
  } else {
    // Real Plaid — exchange public token for access token
    const res = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        public_token: publicToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Plaid public_token/exchange error:", err);
      return NextResponse.json(
        { error: "Failed to exchange Plaid public token" },
        { status: 502 }
      );
    }

    const data = await res.json();
    accessToken = data.access_token;
    itemId = data.item_id;
  }

  const connection = await prisma.plaidConnection.create({
    data: {
      userId: session.user.id,
      institutionId,
      institutionName,
      accessToken,
      itemId,
      status: "ACTIVE",
    },
  });

  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: session.user.id,
      name: institutionName,
      accountType: "CHECKING",
      institutionName,
      currency: "USD",
      currentBalance: 0,
      isPlaidLinked: true,
      plaidAccountId: accountId ?? connection.id,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "PLAID_CONNECT",
    entityType: "PlaidConnection",
    entityId: connection.id,
    after: {
      connectionId: connection.id,
      institutionId,
      institutionName,
      bankAccountId: bankAccount.id,
    },
  });

  return NextResponse.json(
    { success: true, connectionId: connection.id, bankAccountId: bankAccount.id },
    { status: 201 }
  );
}
