import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const obligations = await prisma.performanceObligation.findMany({
    where: { contractId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(obligations);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { name, allocatedValue, notes } = body;

  const obligation = await prisma.performanceObligation.create({
    data: {
      contractId: id,
      userId: session.user.id,
      name,
      allocatedValue: parseFloat(allocatedValue),
      notes: notes || null,
    },
  });

  return NextResponse.json(obligation, { status: 201 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const { obligationId, status, satisfiedAt } = body;

  const obligation = await prisma.performanceObligation.findFirst({
    where: { id: obligationId, contractId: id },
  });
  if (!obligation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.performanceObligation.update({
    where: { id: obligationId },
    data: {
      status: status ?? obligation.status,
      satisfiedAt: satisfiedAt ? new Date(satisfiedAt) : obligation.satisfiedAt,
    },
  });

  return NextResponse.json(updated);
}
