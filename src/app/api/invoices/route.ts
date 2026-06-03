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
    invoiceNumber,
    clientName,
    clientEmail,
    issueDate,
    dueDate,
    taxRate,
    notes,
    lineItems,
    isRecurring,
    recurringInterval,
  } = body as {
    invoiceNumber: string;
    clientName: string;
    clientEmail?: string;
    issueDate: string;
    dueDate: string;
    taxRate?: number;
    notes?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    isRecurring?: boolean;
    recurringInterval?: string;
  };

  if (!invoiceNumber || !clientName || !issueDate || !dueDate) {
    return NextResponse.json(
      { error: "invoiceNumber, clientName, issueDate, dueDate are required" },
      { status: 400 }
    );
  }

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Calculate totals server-side
  const rate = taxRate ?? 0;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
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
      notes: notes ?? undefined,
      publicToken,
      isRecurring: isRecurring ?? false,
      recurringInterval: recurringInterval ?? undefined,
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
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
