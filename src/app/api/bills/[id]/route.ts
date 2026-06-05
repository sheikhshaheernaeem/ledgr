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

  const bill = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(bill);
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

  const existing = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === "PAID" || existing.status === "VOID") {
    return NextResponse.json(
      { error: "Cannot edit a PAID or VOID bill" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const {
    billNumber,
    vendorName,
    vendorEmail,
    issueDate,
    dueDate,
    taxRate,
    notes,
    category,
    currency,
    lineItems,
  } = body as {
    billNumber?: string;
    vendorName?: string;
    vendorEmail?: string;
    issueDate?: string;
    dueDate?: string;
    taxRate?: number;
    notes?: string;
    category?: string;
    currency?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; accountCode?: string }>;
  };

  // Recalculate totals if line items provided
  let subtotal = existing.subtotal;
  let taxAmount = existing.taxAmount;
  let total = existing.total;
  const rate = taxRate ?? existing.taxRate;

  if (lineItems && lineItems.length > 0) {
    subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    taxAmount = subtotal * (rate / 100);
    total = subtotal + taxAmount;
  } else if (taxRate !== undefined) {
    taxAmount = subtotal * (rate / 100);
    total = subtotal + taxAmount;
  }

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      billNumber: billNumber ?? undefined,
      vendorName: vendorName ?? undefined,
      vendorEmail: vendorEmail ?? undefined,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      taxRate: taxRate ?? undefined,
      taxAmount,
      subtotal,
      total,
      notes: notes ?? undefined,
      category: category ?? undefined,
      currency: currency ?? undefined,
      ...(lineItems && lineItems.length > 0
        ? {
            lineItems: {
              deleteMany: {},
              create: lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                accountCode: item.accountCode ?? undefined,
              })),
            },
          }
        : {}),
    },
    include: { lineItems: true },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Bill",
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

  const existing = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT bills can be deleted" },
      { status: 409 }
    );
  }

  await prisma.bill.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Bill",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
