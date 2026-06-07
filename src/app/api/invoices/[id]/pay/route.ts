import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public route for client self-pay via Stripe
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await request.json();
  const { publicToken } = body;

  // Find invoice by id and optional public token
  const invoice = await prisma.invoice.findFirst({
    where: publicToken ? { id, publicToken } : { id },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status === "PAID") return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });

  const amountDue = invoice.total - (invoice.amountPaid || 0);

  // In production, create actual Stripe Payment Intent
  // For now, return a mock payment intent
  const mockPaymentIntent = {
    id: `pi_mock_${Date.now()}`,
    clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
    amount: Math.round(amountDue * 100), // in cents
    currency: (invoice.currency || "USD").toLowerCase(),
    status: "requires_payment_method",
    invoiceId: id,
    invoiceNumber: invoice.invoiceNumber,
    description: `Payment for Invoice #${invoice.invoiceNumber}`,
  };

  return NextResponse.json(mockPaymentIntent);
}
