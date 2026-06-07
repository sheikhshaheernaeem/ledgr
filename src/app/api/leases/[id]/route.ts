import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lease = await prisma.leaseContract.findFirst({
    where: { id, userId: session.user.id },
    include: {
      payments: { orderBy: { paymentDate: "asc" } },
      amortizationSchedule: { orderBy: { period: "asc" } },
    },
  });

  if (!lease) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lease);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lease = await prisma.leaseContract.findFirst({ where: { id, userId: session.user.id } });
  if (!lease) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.leaseContract.update({
    where: { id },
    data: {
      status: body.status ?? lease.status,
      notes: body.notes !== undefined ? body.notes : lease.notes,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lease = await prisma.leaseContract.findFirst({ where: { id, userId: session.user.id } });
  if (!lease) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.leaseContract.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
