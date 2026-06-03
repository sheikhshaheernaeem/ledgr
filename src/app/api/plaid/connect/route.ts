import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { institutionId, institutionName } = body as {
    institutionId: string;
    institutionName: string;
  };

  if (!institutionId || !institutionName) {
    return NextResponse.json(
      { error: "institutionId and institutionName are required" },
      { status: 400 }
    );
  }

  const mockAccessToken = randomUUID();
  const mockItemId = randomUUID();

  const connection = await prisma.plaidConnection.create({
    data: {
      userId: session.user.id,
      institutionId,
      institutionName,
      accessToken: mockAccessToken,
      itemId: mockItemId,
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
      plaidAccountId: connection.id,
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
    { connectionId: connection.id, bankAccountId: bankAccount.id },
    { status: 201 }
  );
}
