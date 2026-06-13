import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Reports that have been SENT to the client but not yet client-approved
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reports = await prisma.report.findMany({
    where: {
      userId: session.user.id as string,
      sentAt: { not: null },
      clientApprovedAt: null,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: {
      id: true, month: true, year: true,
      totalIncome: true, totalExpenses: true, netProfit: true,
      sentAt: true, clientApprovalToken: true,
    },
  });
  return NextResponse.json(reports);
}
