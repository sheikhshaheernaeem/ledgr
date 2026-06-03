import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const clients = await prisma.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { name, email, phone, company, address, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const client = await prisma.client.create({
    data: { userId, name: name.trim(), email: email || null, phone: phone || null, company: company || null, address: address || null, notes: notes || null },
  });

  return NextResponse.json(client, { status: 201 });
}
