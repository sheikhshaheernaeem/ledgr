import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const userId = session.user.id as string;
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: userId, clientId: targetUserId } },
    });
    if (!mc?.isActive) return { error: NextResponse.json({ error: "Not your client" }, { status: 403 }) };
  }
  return { userId };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const g = await operatorGate(clientId);
  if ("error" in g) return g.error;

  const entries = await prisma.journalEntry.findMany({
    where: { userId: clientId },
    orderBy: { date: "desc" },
    take: 100,
    include: { lines: { include: { account: { select: { id: true, code: true, name: true, type: true } } } } },
  });
  const accounts = await prisma.chartOfAccount.findMany({
    where: { userId: clientId, isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, type: true },
  });

  return NextResponse.json({ entries, accounts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, date, description, memo, reference, lines } = body as {
    clientId: string;
    date: string;
    description: string;
    memo?: string;
    reference?: string;
    lines: Array<{ accountId: string; debit?: number; credit?: number; description?: string }>;
  };

  if (!clientId || !date || !description || !lines?.length) {
    return NextResponse.json({ error: "clientId, date, description, lines required" }, { status: 400 });
  }

  const g = await operatorGate(clientId);
  if ("error" in g) return g.error;

  // Balance check
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    return NextResponse.json({
      error: `Unbalanced — debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}`,
    }, { status: 400 });
  }
  if (totalDebit === 0) {
    return NextResponse.json({ error: "Entry has no values" }, { status: 400 });
  }

  // Find next entry number for this client
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { userId: clientId },
    orderBy: { createdAt: "desc" },
    select: { entryNumber: true },
  });
  const nextNum = lastEntry
    ? `JE-${String(parseInt(lastEntry.entryNumber.replace(/\D/g, "")) + 1).padStart(5, "0")}`
    : "JE-00001";

  const entry = await prisma.journalEntry.create({
    data: {
      userId: clientId,
      entryNumber: nextNum,
      date: new Date(date),
      description: description.trim(),
      memo: memo?.trim() || null,
      reference: reference?.trim() || null,
      type: "MANUAL",
      status: "POSTED",
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          description: l.description?.trim() || null,
        })),
      },
    },
    include: { lines: { include: { account: { select: { id: true, code: true, name: true, type: true } } } } },
  });

  return NextResponse.json(entry, { status: 201 });
}
