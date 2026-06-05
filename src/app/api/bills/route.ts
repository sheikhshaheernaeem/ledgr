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

  // Auto-update OVERDUE status for past-due PENDING bills
  await prisma.bill.updateMany({
    where: {
      userId: session.user.id,
      status: "PENDING",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bills);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    billNumber: rawBillNumber,
    vendorName,
    vendorEmail,
    issueDate,
    dueDate,
    taxRate,
    notes,
    category,
    currency,
    status,
    lineItems,
  } = body as {
    billNumber?: string;
    vendorName: string;
    vendorEmail?: string;
    issueDate: string;
    dueDate: string;
    taxRate?: number;
    notes?: string;
    category?: string;
    currency?: string;
    status?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; accountCode?: string }>;
  };

  if (!vendorName || !issueDate || !dueDate) {
    return NextResponse.json(
      { error: "vendorName, issueDate, dueDate are required" },
      { status: 400 }
    );
  }

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Auto-generate bill number if not provided
  let billNumber = rawBillNumber?.trim() || "";
  if (!billNumber) {
    const count = await prisma.bill.count({ where: { userId: session.user.id } });
    billNumber = `BILL-${String(count + 1).padStart(4, "0")}`;
  }

  // Calculate totals server-side
  const rate = taxRate ?? 0;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount;

  const bill = await prisma.bill.create({
    data: {
      userId: session.user.id,
      billNumber,
      vendorName,
      vendorEmail: vendorEmail ?? undefined,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      taxRate: rate,
      taxAmount,
      subtotal,
      total,
      notes: notes ?? undefined,
      category: category ?? undefined,
      currency: currency ?? "USD",
      status: status ?? "PENDING",
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          accountCode: item.accountCode ?? undefined,
        })),
      },
    },
    include: { lineItems: true },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Bill",
    entityId: bill.id,
    after: bill,
  });

  return NextResponse.json(bill, { status: 201 });
}
