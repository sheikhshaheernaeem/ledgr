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

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
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
    where: { id, userId: session.user.id },
    include: { lineItems: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    invoiceNumber,
    clientName,
    clientEmail,
    issueDate,
    dueDate,
    taxRate,
    notes,
    lineItems,
    amountPaid,
    type,
  } = body as {
    invoiceNumber?: string;
    clientName?: string;
    clientEmail?: string;
    issueDate?: string;
    dueDate?: string;
    taxRate?: number;
    notes?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
    amountPaid?: number;
    type?: string;
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

  // Determine new amountPaid and whether to auto-mark PAID
  const newAmountPaid = amountPaid !== undefined ? amountPaid : existing.amountPaid;
  const autoStatusPaid = newAmountPaid >= total && existing.status !== "PAID" ? "PAID" : undefined;

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      invoiceNumber: invoiceNumber ?? undefined,
      clientName: clientName ?? undefined,
      clientEmail: clientEmail ?? undefined,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      taxRate: taxRate ?? undefined,
      taxAmount,
      subtotal,
      total,
      notes: notes ?? undefined,
      type: type ?? undefined,
      amountPaid: amountPaid !== undefined ? amountPaid : undefined,
      ...(autoStatusPaid ? { status: "PAID", paidAt: new Date() } : {}),
      ...(lineItems && lineItems.length > 0
        ? {
            lineItems: {
              deleteMany: {},
              create: lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
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
    entityType: "Invoice",
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
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT invoices can be deleted" },
      { status: 409 }
    );
  }

  await prisma.invoice.delete({ where: { id } });

  await writeAudit({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Invoice",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
