import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status } = body as { status: string };

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
      amountPaid: status === "PAID" ? existing.total : undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Bill",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status, paidAt: updated.paidAt },
  });

  return NextResponse.json(updated);
}
