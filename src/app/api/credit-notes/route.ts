import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creditNotes = await prisma.invoice.findMany({
    where: { userId: session.user.id, type: "CREDIT_NOTE" },
    include: {
      lineItems: true,
      relatedInvoice: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(creditNotes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    creditNoteNumber: rawCreditNoteNumber,
    clientName,
    clientEmail,
    relatedInvoiceId,
    issueDate,
    notes,
    lineItems,
    taxRate,
    currency,
  } = body as {
    creditNoteNumber?: string;
    clientName: string;
    clientEmail?: string;
    relatedInvoiceId?: string;
    issueDate: string;
    notes?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    taxRate?: number;
    currency?: string;
  };

  if (!clientName || !issueDate) {
    return NextResponse.json(
      { error: "clientName and issueDate are required" },
      { status: 400 }
    );
  }

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Verify relatedInvoice belongs to user if provided
  if (relatedInvoiceId) {
    const relatedInv = await prisma.invoice.findFirst({
      where: { id: relatedInvoiceId, userId: session.user.id },
    });
    if (!relatedInv) {
      return NextResponse.json(
        { error: "Related invoice not found" },
        { status: 404 }
      );
    }
  }

  // Auto-generate credit note number
  let creditNoteNumber = rawCreditNoteNumber?.trim() || "";
  if (!creditNoteNumber) {
    const count = await prisma.invoice.count({
      where: { userId: session.user.id, type: "CREDIT_NOTE" },
    });
    creditNoteNumber = `CN-${String(count + 1).padStart(4, "0")}`;
  }

  const rate = taxRate ?? 0;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount;

  const creditNote = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      invoiceNumber: creditNoteNumber,
      clientName,
      clientEmail: clientEmail ?? undefined,
      issueDate: new Date(issueDate),
      dueDate: new Date(issueDate),
      taxRate: rate,
      taxAmount,
      subtotal,
      total,
      notes: notes ?? undefined,
      type: "CREDIT_NOTE",
      status: "DRAFT",
      currency: currency ?? "USD",
      relatedInvoiceId: relatedInvoiceId ?? undefined,
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        })),
      },
    },
    include: {
      lineItems: true,
      relatedInvoice: { select: { id: true, invoiceNumber: true } },
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "CreditNote",
    entityId: creditNote.id,
    after: creditNote,
  });

  return NextResponse.json(creditNote, { status: 201 });
}
