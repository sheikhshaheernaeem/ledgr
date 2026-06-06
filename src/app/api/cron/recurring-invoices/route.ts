import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const dueInvoices = await prisma.invoice.findMany({
    where: {
      isRecurring: true,
      nextInvoiceDate: { lte: now },
      status: { notIn: ["VOID"] },
    },
    include: { lineItems: true },
  });

  let created = 0;

  for (const invoice of dueInvoices) {
    try {
      const issueDate = invoice.nextInvoiceDate ?? now;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const count = await prisma.invoice.count({ where: { userId: invoice.userId } });
      const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;
      const publicToken = crypto.randomUUID();

      await prisma.invoice.create({
        data: {
          userId: invoice.userId,
          invoiceNumber,
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail ?? undefined,
          clientId: invoice.clientId ?? undefined,
          issueDate,
          dueDate,
          status: "DRAFT",
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          subtotal: invoice.subtotal,
          total: invoice.total,
          notes: invoice.notes ?? undefined,
          publicToken,
          type: invoice.type,
          currency: invoice.currency,
          lateFeePct: invoice.lateFeePct,
          isRecurring: false,
          lineItems: {
            create: invoice.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        },
      });

      // Advance nextInvoiceDate based on recurringInterval
      const nextDate = new Date(issueDate);
      const interval = invoice.recurringInterval ?? "MONTHLY";
      if (interval === "WEEKLY") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (interval === "MONTHLY") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (interval === "QUARTERLY") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (interval === "ANNUALLY") {
        nextDate.setMonth(nextDate.getMonth() + 12);
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { nextInvoiceDate: nextDate },
      });

      created++;
    } catch (err) {
      console.error(`Failed to process recurring invoice ${invoice.id}:`, err);
    }
  }

  return NextResponse.json({ created });
}
