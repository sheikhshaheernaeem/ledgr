import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estimates = await prisma.invoice.findMany({
    where: { userId: session.user.id, type: "ESTIMATE" },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(estimates);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    estimateNumber: rawEstimateNumber,
    clientName,
    clientEmail,
    issueDate,
    expiryDate,
    taxRate,
    notes,
    lineItems,
    currency,
  } = body as {
    estimateNumber?: string;
    clientName: string;
    clientEmail?: string;
    issueDate: string;
    expiryDate: string;
    taxRate?: number;
    notes?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    currency?: string;
  };

  if (!clientName || !issueDate || !expiryDate) {
    return NextResponse.json(
      { error: "clientName, issueDate, and expiryDate are required" },
      { status: 400 }
    );
  }

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Auto-generate estimate number
  let estimateNumber = rawEstimateNumber?.trim() || "";
  if (!estimateNumber) {
    const count = await prisma.invoice.count({
      where: { userId: session.user.id, type: "ESTIMATE" },
    });
    estimateNumber = `EST-${String(count + 1).padStart(4, "0")}`;
  }

  const rate = taxRate ?? 0;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount;

  const estimate = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      invoiceNumber: estimateNumber,
      clientName,
      clientEmail: clientEmail ?? undefined,
      issueDate: new Date(issueDate),
      dueDate: new Date(expiryDate),
      taxRate: rate,
      taxAmount,
      subtotal,
      total,
      notes: notes ?? undefined,
      type: "ESTIMATE",
      status: "DRAFT",
      currency: currency ?? "USD",
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
    entityType: "Estimate",
    entityId: estimate.id,
    after: estimate,
  });

  return NextResponse.json(estimate, { status: 201 });
}
