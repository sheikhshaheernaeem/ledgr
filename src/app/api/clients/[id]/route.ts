import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id as string },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { invoices: true } },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id as string;

  const existing = await prisma.client.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, phone, company, address, notes, taxId } = await req.json();
  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: name?.trim() ?? existing.name,
      email: email !== undefined ? (email || null) : existing.email,
      phone: phone !== undefined ? (phone || null) : existing.phone,
      company: company !== undefined ? (company || null) : existing.company,
      address: address !== undefined ? (address || null) : existing.address,
      notes: notes !== undefined ? (notes || null) : existing.notes,
      taxId: taxId !== undefined ? (taxId || null) : existing.taxId,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id as string;

  const existing = await prisma.client.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
