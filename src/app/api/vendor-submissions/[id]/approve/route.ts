import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const submission = await prisma.vendorBillSubmission.findFirst({
    where: { id, invite: { userId: session.user.id } },
    include: { invite: true },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status !== "SUBMITTED") return NextResponse.json({ error: "Submission already processed" }, { status: 400 });

  // Get next bill number
  const lastBill = await prisma.bill.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const nextNum = lastBill
    ? `BILL-${String(parseInt(lastBill.billNumber.replace(/\D/g, "") || "0") + 1).padStart(4, "0")}`
    : "BILL-0001";

  // Convert to bill
  const bill = await prisma.bill.create({
    data: {
      userId: session.user.id,
      billNumber: nextNum,
      vendorName: submission.vendorName,
      issueDate: new Date(),
      dueDate: submission.dueDate,
      status: "PENDING",
      subtotal: submission.amount,
      taxRate: 0,
      taxAmount: 0,
      total: submission.amount,
      currency: submission.currency,
      notes: submission.description,
    },
  });

  // Update submission
  await prisma.vendorBillSubmission.update({
    where: { id },
    data: { status: "CONVERTED", convertedBillId: bill.id },
  });

  return NextResponse.json({ success: true, bill });
}
