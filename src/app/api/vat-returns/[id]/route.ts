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

  const existing = await prisma.vatReturn.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, notes } = body as { status?: string; notes?: string };

  const updated = await prisma.vatReturn.update({
    where: { id },
    data: {
      status: status ?? undefined,
      notes: notes ?? undefined,
      filedAt: status === "FILED" && !existing.filedAt ? new Date() : undefined,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "VatReturn",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status, filedAt: updated.filedAt },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.vatReturn.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT VAT returns can be deleted" },
      { status: 409 }
    );
  }

  await prisma.vatReturn.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "VatReturn",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
