import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId },
    include: {
      lines: {
        include: {
          account: { select: { code: true, name: true, type: true, normalBalance: true } },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId },
    include: { lines: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // DRAFT entries can be physically deleted
  if (entry.status === "DRAFT") {
    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  // POSTED entries: create a reversal
  if (entry.status !== "POSTED") {
    return NextResponse.json({ error: "Only DRAFT or POSTED entries can be reversed/deleted" }, { status: 409 });
  }

  // Auto-generate reversal entry number
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
  const reversalNumber = `JE-${String(nextNum).padStart(4, "0")}`;

  // Mark original as REVERSED and create reversal entry
  const [, reversal] = await prisma.$transaction([
    prisma.journalEntry.update({
      where: { id },
      data: { status: "REVERSED" },
    }),
    prisma.journalEntry.create({
      data: {
        userId,
        entryNumber: reversalNumber,
        date: new Date(),
        description: `REVERSAL of ${entry.entryNumber}: ${entry.description}`,
        reference: entry.reference ?? null,
        type: entry.type,
        status: "POSTED",
        reversalOf: id,
        memo: `Auto-generated reversal of ${entry.entryNumber}`,
        lines: {
          create: entry.lines.map((l) => ({
            accountId: l.accountId,
            description: l.description ?? null,
            debit: l.credit,   // flipped
            credit: l.debit,   // flipped
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
    }),
  ]);

  return NextResponse.json({ reversed: true, reversalEntry: reversal });
}
