import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ transactions: [], invoices: [] });
  }

  const userId = session.user.id as string;

  const [transactions, invoices] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        description: { contains: q, mode: "insensitive" },
      },
      select: { id: true, description: true, amount: true, date: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { invoiceNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, invoiceNumber: true, clientName: true, total: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ transactions, invoices });
}
