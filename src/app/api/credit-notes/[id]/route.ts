import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const creditNote = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, type: "CREDIT_NOTE" },
    include: {
      lineItems: true,
      relatedInvoice: { select: { id: true, invoiceNumber: true } },
    },
  });

  if (!creditNote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(creditNote);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, type: "CREDIT_NOTE" },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status } = body as { status?: string };

  const validStatuses = ["DRAFT", "ISSUED", "APPLIED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: status ?? undefined,
    },
    include: {
      lineItems: true,
      relatedInvoice: { select: { id: true, invoiceNumber: true } },
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "CreditNote",
    entityId: id,
    before: existing,
    after: updated,
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

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, type: "CREDIT_NOTE" },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT credit notes can be deleted" },
      { status: 409 }
    );
  }

  await prisma.invoice.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "CreditNote",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
