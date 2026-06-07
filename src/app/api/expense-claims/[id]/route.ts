import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const claim = await prisma.expenseClaim.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { orderBy: { date: "asc" } } },
  });

  if (!claim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(claim);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const claim = await prisma.expenseClaim.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!claim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, description, notes, items } = body as {
    status?: string;
    description?: string;
    notes?: string;
    items?: Array<{
      date: string;
      description: string;
      category?: string;
      amount: number;
      receiptData?: string;
    }>;
  };

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (description !== undefined) updateData.description = description;
  if (notes !== undefined) updateData.notes = notes;

  if (status !== undefined) {
    updateData.status = status;
    if (status === "SUBMITTED" && !claim.submittedAt) {
      updateData.submittedAt = new Date();
    }
    if (status === "APPROVED" && !claim.approvedAt) {
      updateData.approvedAt = new Date();
    }
    if (status === "PAID" && !claim.paidAt) {
      updateData.paidAt = new Date();
    }
  }

  if (items !== undefined) {
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    updateData.totalAmount = totalAmount;
  }

  let updated;
  if (items !== undefined) {
    // Replace items
    await prisma.expenseClaimItem.deleteMany({ where: { claimId: id } });
    updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        ...updateData,
        items: {
          create: items.map((item) => ({
            date: new Date(item.date),
            description: item.description,
            category: item.category ?? undefined,
            amount: item.amount,
            receiptData: item.receiptData ?? undefined,
          })),
        },
      },
      include: { items: true },
    });
  } else {
    updated = await prisma.expenseClaim.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const claim = await prisma.expenseClaim.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!claim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (claim.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT claims can be deleted" },
      { status: 400 }
    );
  }

  await prisma.expenseClaim.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
