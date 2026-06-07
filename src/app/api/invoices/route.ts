import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Auto-update OVERDUE status for past-due SENT invoices
  await prisma.invoice.updateMany({
    where: {
      userId: session.user.id,
      status: "SENT",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    invoiceNumber: rawInvoiceNumber,
    clientName,
    clientEmail,
    issueDate,
    dueDate,
    taxRate,
    lateFeePct,
    notes,
    lineItems,
    isRecurring,
    recurringInterval,
    type,
    currency,
  } = body as {
    invoiceNumber?: string;
    clientName: string;
    clientEmail?: string;
    issueDate: string;
    dueDate: string;
    taxRate?: number;
    lateFeePct?: number;
    notes?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; discount?: number }>;
    isRecurring?: boolean;
    recurringInterval?: string;
    type?: string;
    currency?: string;
  };

  if (!clientName || !issueDate || !dueDate) {
    return NextResponse.json(
      { error: "clientName, issueDate, dueDate are required" },
      { status: 400 }
    );
  }

  // Auto-generate invoice number if not provided
  let invoiceNumber = rawInvoiceNumber?.trim() || "";
  if (!invoiceNumber) {
    const count = await prisma.invoice.count({ where: { userId: session.user.id } });
    invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;
  }

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Calculate totals server-side
  const rate = taxRate ?? 0;
  const discountAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * ((item.discount ?? 0) / 100),
    0
  );
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100),
    0
  );
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount;

  const publicToken = crypto.randomUUID();

  const invoice = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      invoiceNumber,
      clientName,
      clientEmail: clientEmail ?? undefined,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      taxRate: rate,
      taxAmount,
      subtotal,
      total,
      discountAmount,
      notes: notes ?? undefined,
      publicToken,
      type: type ?? "INVOICE",
      currency: currency ?? "USD",
      lateFeePct: lateFeePct ?? 0,
      isRecurring: isRecurring ?? false,
      recurringInterval: recurringInterval ?? undefined,
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 0,
          amount: item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100),
        })),
      },
    },
    include: { lineItems: true },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    after: invoice,
  });

  return NextResponse.json(invoice, { status: 201 });
}
