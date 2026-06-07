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

  const creditNote = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, type: "CREDIT_NOTE" },
  });

  if (!creditNote) {
    return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
  }

  if (creditNote.status === "APPLIED") {
    return NextResponse.json(
      { error: "Credit note has already been applied" },
      { status: 409 }
    );
  }

  if (creditNote.status !== "ISSUED") {
    return NextResponse.json(
      { error: "Credit note must be ISSUED before it can be applied" },
      { status: 409 }
    );
  }

  if (!creditNote.relatedInvoiceId) {
    return NextResponse.json(
      { error: "No related invoice to apply this credit note to" },
      { status: 400 }
    );
  }

  const relatedInvoice = await prisma.invoice.findFirst({
    where: { id: creditNote.relatedInvoiceId, userId: session.user.id },
  });

  if (!relatedInvoice) {
    return NextResponse.json({ error: "Related invoice not found" }, { status: 404 });
  }

  // Increase amountPaid on the related invoice by the credit note total
  const newAmountPaid = relatedInvoice.amountPaid + creditNote.total;
  const isFullyPaid = newAmountPaid >= relatedInvoice.total;

  const updatedInvoice = await prisma.invoice.update({
    where: { id: relatedInvoice.id },
    data: {
      amountPaid: newAmountPaid,
      ...(isFullyPaid ? { status: "PAID", paidAt: new Date() } : {}),
    },
  });

  // Mark credit note as APPLIED
  const updatedCreditNote = await prisma.invoice.update({
    where: { id: creditNote.id },
    data: { status: "APPLIED" },
  });

  await writeAudit({
    userId: session.user.id,
    action: "APPLY",
    entityType: "CreditNote",
    entityId: creditNote.id,
    after: {
      appliedToInvoiceId: relatedInvoice.id,
      creditAmount: creditNote.total,
      invoiceNewAmountPaid: newAmountPaid,
      invoiceMarkedPaid: isFullyPaid,
    },
  });

  return NextResponse.json({
    creditNote: updatedCreditNote,
    invoice: updatedInvoice,
  });
}
