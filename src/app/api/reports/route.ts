import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id as string },
    select: { id: true, month: true, year: true, status: true, netProfit: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(reports);
}
