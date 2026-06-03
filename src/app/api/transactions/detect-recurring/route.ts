import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, status: "APPROVED" },
    orderBy: { date: "asc" },
  });

  // Group by normalized description
  const groups = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = tx.description.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  let flagged = 0;
  const updates: Array<{ ids: string[]; groupId: string }> = [];

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Sort by date ascending
    const sorted = [...group].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check if consecutive dates are 20-40 days apart
    let isRecurringGroup = true;
    for (let i = 1; i < sorted.length; i++) {
      const diffMs =
        new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 20 || diffDays > 40) {
        isRecurringGroup = false;
        break;
      }
    }

    if (isRecurringGroup) {
      const groupId = sorted[0].id;
      updates.push({
        ids: sorted.map((t) => t.id),
        groupId,
      });
      flagged += sorted.length;
    }
  }

  // Apply updates
  await Promise.all(
    updates.map(({ ids, groupId }) =>
      prisma.transaction.updateMany({
        where: { id: { in: ids } },
        data: { isRecurring: true, recurringGroupId: groupId },
      })
    )
  );

  return NextResponse.json({ flagged });
}
