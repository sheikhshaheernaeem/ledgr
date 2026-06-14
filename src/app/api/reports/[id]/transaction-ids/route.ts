import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const txns = await prisma.transaction.findMany({
    where: { userId: session.user.id, reportId: id },
    select: { id: true },
  });

  return NextResponse.json({ transactionIds: txns.map((t) => t.id) });
}
