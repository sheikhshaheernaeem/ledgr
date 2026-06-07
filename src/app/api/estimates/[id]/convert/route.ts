import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const estimate = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, type: "ESTIMATE" },
    include: { lineItems: true },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Only ACCEPTED estimates can be converted to invoices" },
      { status: 409 }
    );
  }

  // Generate a new invoice number
  const count = await prisma.invoice.count({
    where: { userId: session.user.id, type: "INVOICE" },
  });
  const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

  const publicToken = crypto.randomUUID();

  // Create the new invoice from the estimate data
  const newInvoice = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      invoiceNumber,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail ?? undefined,
      issueDate: new Date(),
      dueDate: estimate.dueDate,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      subtotal: estimate.subtotal,
      total: estimate.total,
      notes: estimate.notes ?? undefined,
      type: "INVOICE",
      status: "DRAFT",
      currency: estimate.currency,
      publicToken,
      relatedInvoiceId: estimate.id,
      lineItems: {
        create: estimate.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      },
    },
    include: { lineItems: true },
  });

  // Update estimate status to CONVERTED
  await prisma.invoice.update({
    where: { id: estimate.id },
    data: { status: "CONVERTED" },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CONVERT",
    entityType: "Estimate",
    entityId: estimate.id,
    after: { convertedToInvoiceId: newInvoice.id },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Invoice",
    entityId: newInvoice.id,
    after: newInvoice,
  });

  return NextResponse.json({ invoiceId: newInvoice.id }, { status: 201 });
}
