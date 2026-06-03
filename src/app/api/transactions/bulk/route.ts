import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: "APPROVE" | "REJECT" };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json(
      { error: "action must be APPROVE or REJECT" },
      { status: 400 }
    );
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const existing = await prisma.transaction.findMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  if (existing.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  await prisma.transaction.updateMany({
    where: { id: { in: existing.map((t) => t.id) }, userId: session.user.id },
    data: { status: newStatus },
  });

  await Promise.all(
    existing.map((tx) =>
      writeAudit({
        userId: session.user!.id as string,
        action: `BULK_${action}`,
        entityType: "Transaction",
        entityId: tx.id,
        before: { status: tx.status },
        after: { status: newStatus },
        transactionId: tx.id,
      })
    )
  );

  return NextResponse.json({ updated: existing.length });
}
