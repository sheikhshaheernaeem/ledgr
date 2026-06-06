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
  const { ids, action, rejectionReason } = body as {
    ids: string[];
    action: "APPROVE" | "REJECT";
    rejectionReason?: string;
  };

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

  // Build update data — include aiNotes as rejection reason when provided
  const updateData: Record<string, string | null> = { status: newStatus };
  if (action === "REJECT" && rejectionReason) {
    updateData.aiNotes = rejectionReason;
  }

  await prisma.transaction.updateMany({
    where: { id: { in: existing.map((t) => t.id) }, userId: session.user.id },
    data: updateData,
  });

  await Promise.all(
    existing.map((tx) =>
      writeAudit({
        userId: session.user!.id as string,
        action: `BULK_${action}`,
        entityType: "Transaction",
        entityId: tx.id,
        before: { status: tx.status },
        after: { status: newStatus, ...(rejectionReason ? { rejectionReason } : {}) },
        transactionId: tx.id,
      })
    )
  );

  return NextResponse.json({ updated: existing.length });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, updates } = body as {
    ids: string[];
    updates: { category?: string; subcategory?: string; taxCategory?: string; status?: string };
  };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "updates object is required" }, { status: 400 });
  }

  const existing = await prisma.transaction.findMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  if (existing.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Build safe update data — only allow known fields
  const data: Record<string, string | null> = {};
  if ("category" in updates) data.category = updates.category ?? null;
  if ("subcategory" in updates) data.subcategory = updates.subcategory ?? null;
  if ("taxCategory" in updates) data.taxCategory = updates.taxCategory ?? null;
  if ("status" in updates) data.status = updates.status ?? null;

  await prisma.transaction.updateMany({
    where: { id: { in: existing.map((t) => t.id) }, userId: session.user.id },
    data,
  });

  await Promise.all(
    existing.map((tx) =>
      writeAudit({
        userId: session.user!.id as string,
        action: "BULK_UPDATE",
        entityType: "Transaction",
        entityId: tx.id,
        before: {
          category: tx.category,
          subcategory: tx.subcategory,
          taxCategory: tx.taxCategory,
          status: tx.status,
        },
        after: data,
        transactionId: tx.id,
      })
    )
  );

  return NextResponse.json({ updated: existing.length });
}
