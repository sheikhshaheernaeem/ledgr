import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      obligations: true,
      schedules: { orderBy: { period: "asc" } },
    },
  });

  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.revenueContract.update({
    where: { id },
    data: {
      name: body.name ?? contract.name,
      totalValue: body.totalValue !== undefined ? parseFloat(body.totalValue) : contract.totalValue,
      status: body.status ?? contract.status,
      recognitionMethod: body.recognitionMethod ?? contract.recognitionMethod,
      endDate: body.endDate ? new Date(body.endDate) : contract.endDate,
      notes: body.notes !== undefined ? body.notes : contract.notes,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const contract = await prisma.revenueContract.findFirst({ where: { id, userId: session.user.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.revenueContract.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
