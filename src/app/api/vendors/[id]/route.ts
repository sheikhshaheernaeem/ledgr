import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const body = await req.json();
  const vendor = await prisma.vendor.findFirst({ where: { id, userId } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: body.name?.trim() || vendor.name,
      email: body.email !== undefined ? body.email || null : vendor.email,
      phone: body.phone !== undefined ? body.phone || null : vendor.phone,
      company: body.company !== undefined ? body.company || null : vendor.company,
      address: body.address !== undefined ? body.address || null : vendor.address,
      taxId: body.taxId !== undefined ? body.taxId || null : vendor.taxId,
      vatNumber: body.vatNumber !== undefined ? body.vatNumber || null : vendor.vatNumber,
      notes: body.notes !== undefined ? body.notes || null : vendor.notes,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const vendor = await prisma.vendor.findFirst({ where: { id, userId } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
