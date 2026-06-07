import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const balances = await prisma.openingBalance.findMany({ where: { userId: session.user.id as string } });
  return NextResponse.json(balances);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { asOfDate, balances } = await req.json() as {
    asOfDate: string;
    balances: { accountCode: string; accountName: string; accountType: string; debit: number; credit: number }[];
  };
  if (!asOfDate || !Array.isArray(balances)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const date = new Date(asOfDate);
  await prisma.$transaction(
    balances.map((b) =>
      prisma.openingBalance.upsert({
        where: { userId_accountCode: { userId, accountCode: b.accountCode } },
        create: { userId, accountCode: b.accountCode, accountName: b.accountName, accountType: b.accountType, debit: b.debit, credit: b.credit, asOfDate: date },
        update: { accountName: b.accountName, accountType: b.accountType, debit: b.debit, credit: b.credit, asOfDate: date },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
