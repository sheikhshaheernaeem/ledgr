import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dept = await prisma.department.findFirst({
    where: { id, userId: session.user.id },
    include: { parent: true, children: true, projects: true },
  });

  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dept);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dept = await prisma.department.findFirst({ where: { id, userId: session.user.id } });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: body.name ?? dept.name,
      code: body.code ? body.code.toUpperCase() : dept.code,
      description: body.description !== undefined ? body.description : dept.description,
      managerId: body.managerId !== undefined ? body.managerId : dept.managerId,
      parentId: body.parentId !== undefined ? body.parentId : dept.parentId,
      isActive: body.isActive !== undefined ? body.isActive : dept.isActive,
      budgetJson: body.budgetJson ? JSON.stringify(body.budgetJson) : dept.budgetJson,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dept = await prisma.department.findFirst({ where: { id, userId: session.user.id } });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
