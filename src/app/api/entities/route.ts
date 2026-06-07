import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entities = await prisma.entity.findMany({
    where: { userId: session.user.id },
    include: { parent: true, children: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, code, type, parentId, currency, taxId, address } = body;

    if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

    const entity = await prisma.entity.create({
      data: {
        userId: session.user.id,
        name,
        code: code.toUpperCase(),
        type: type || "SUBSIDIARY",
        parentId: parentId || null,
        currency: currency || "USD",
        taxId: taxId || null,
        address: address || null,
      },
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create entity";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Entity code already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
