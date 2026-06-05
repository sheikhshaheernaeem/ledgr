import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (type && type !== "ALL") where.type = type;

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      lines: {
        include: {
          account: { select: { code: true, name: true, type: true, normalBalance: true } },
        },
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { date, description, reference, type, memo, status, lines } = body;

  if (!date || !description) {
    return NextResponse.json({ error: "date and description are required" }, { status: 400 });
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "At least 2 journal lines are required" }, { status: 400 });
  }

  // Validate balance
  const totalDebits = lines.reduce((s: number, l: { debit?: number }) => s + (l.debit ?? 0), 0);
  const totalCredits = lines.reduce((s: number, l: { credit?: number }) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    return NextResponse.json(
      { error: `Journal entry is not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Auto-generate entry number
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { userId },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });
  let nextNum = 1;
  if (lastEntry?.entryNumber) {
    const match = lastEntry.entryNumber.match(/\d+$/);
    if (match) nextNum = parseInt(match[0]) + 1;
  }
  const entryNumber = `JE-${String(nextNum).padStart(4, "0")}`;

  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      entryNumber,
      date: new Date(date),
      description,
      reference: reference ?? null,
      type: type ?? "MANUAL",
      status: status ?? "POSTED",
      memo: memo ?? null,
      lines: {
        create: lines.map((l: {
          accountId: string;
          description?: string;
          debit?: number;
          credit?: number;
        }) => ({
          accountId: l.accountId,
          description: l.description ?? null,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: { select: { code: true, name: true, type: true, normalBalance: true } },
        },
      },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
