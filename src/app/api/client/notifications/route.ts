import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = session.user.id as string;

  const [unreadMessages, pendingReports, openDocReqs, pendingItems] = await Promise.all([
    prisma.message.count({
      where: { userId, role: "ACCOUNTANT", readAt: null },
    }),
    prisma.report.count({
      where: { userId, sentAt: { not: null }, clientApprovedAt: null },
    }),
    prisma.documentRequest.findMany({
      where: { clientId: userId, status: { in: ["OPEN", "PARTIAL"] } },
      select: { itemsJson: true },
    }),
    Promise.resolve(0),
  ]);
  void pendingItems;

  let pendingDocItems = 0;
  for (const dr of openDocReqs) {
    try {
      const items = JSON.parse(dr.itemsJson) as Array<{ status: string }>;
      pendingDocItems += items.filter((i) => i.status === "pending").length;
    } catch {}
  }

  return NextResponse.json({
    unreadMessages,
    pendingReports,
    pendingDocRequests: openDocReqs.length,
    pendingDocItems,
    total: unreadMessages + pendingReports + pendingDocItems,
  });
}
