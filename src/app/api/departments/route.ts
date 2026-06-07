import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { userId: session.user.id },
    include: { parent: true, children: true, projects: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, code, description, managerId, parentId, budgetJson } = body;

    if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

    const dept = await prisma.department.create({
      data: {
        userId: session.user.id,
        name,
        code: code.toUpperCase(),
        description: description || null,
        managerId: managerId || null,
        parentId: parentId || null,
        budgetJson: budgetJson ? JSON.stringify(budgetJson) : null,
      },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Code already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
