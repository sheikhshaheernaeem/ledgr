import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const vendors = await prisma.vendor.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { bills: true } } },
  });

  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { name, email, phone, company, address, taxId, vatNumber, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const vendor = await prisma.vendor.create({
    data: {
      userId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      company: company || null,
      address: address || null,
      taxId: taxId || null,
      vatNumber: vatNumber || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(vendor, { status: 201 });
}
