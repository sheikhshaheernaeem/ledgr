import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { timeEntryIds, clientId, dueDate } = body as {
    timeEntryIds: string[];
    clientId: string;
    dueDate: string;
  };

  if (!timeEntryIds || timeEntryIds.length === 0) {
    return NextResponse.json({ error: "timeEntryIds is required" }, { status: 400 });
  }
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  if (!dueDate) return NextResponse.json({ error: "dueDate is required" }, { status: 400 });

  // Fetch entries: must be billable, not invoiced, belong to user
  const entries = await prisma.timeEntry.findMany({
    where: {
      id: { in: timeEntryIds },
      userId,
      billable: true,
      invoiced: false,
    },
    include: { client: true },
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "No valid billable, un-invoiced entries found" }, { status: 400 });
  }

  // Get client name
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Auto-generate invoice number
  const count = await prisma.invoice.count({ where: { userId } });
  const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals
  const subtotal = entries.reduce((sum, e) => sum + e.amount, 0);
  const total = subtotal; // no tax on time entries by default

  const publicToken = crypto.randomUUID();

  // Create invoice with line items from time entries
  const invoice = await prisma.invoice.create({
    data: {
      userId,
      invoiceNumber,
      clientName: client.name,
      clientEmail: client.email ?? undefined,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      taxRate: 0,
      taxAmount: 0,
      subtotal,
      total,
      publicToken,
      type: "INVOICE",
      currency: "USD",
      lineItems: {
        create: entries.map((e) => ({
          description: e.description,
          quantity: e.hours,
          unitPrice: e.hourlyRate,
          amount: e.amount,
        })),
      },
    },
  });

  // Mark all time entries as invoiced
  await prisma.timeEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: { invoiced: true, invoiceId: invoice.id },
  });

  return NextResponse.json({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }, { status: 201 });
}
