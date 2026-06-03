import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, accountType, institutionName, lastFourDigits, currency, currentBalance } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const account = await prisma.bankAccount.create({
    data: {
      userId: session.user.id,
      name,
      accountType: accountType ?? "CHECKING",
      institutionName: institutionName ?? undefined,
      lastFourDigits: lastFourDigits ?? undefined,
      currency: currency ?? "USD",
      currentBalance: currentBalance ?? 0,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "BankAccount",
    entityId: account.id,
    after: account,
  });

  return NextResponse.json(account, { status: 201 });
}
