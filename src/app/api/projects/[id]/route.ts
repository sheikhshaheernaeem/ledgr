import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      department: true,
      tasks: { orderBy: { createdAt: "asc" } },
      costs: { orderBy: { date: "desc" } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: body.name ?? project.name,
      code: body.code ? body.code.toUpperCase() : project.code,
      description: body.description !== undefined ? body.description : project.description,
      clientId: body.clientId !== undefined ? body.clientId : project.clientId,
      departmentId: body.departmentId !== undefined ? body.departmentId : project.departmentId,
      status: body.status ?? project.status,
      startDate: body.startDate ? new Date(body.startDate) : project.startDate,
      endDate: body.endDate ? new Date(body.endDate) : project.endDate,
      budget: body.budget !== undefined ? parseFloat(body.budget) : project.budget,
      billingType: body.billingType ?? project.billingType,
      hourlyRate: body.hourlyRate !== undefined ? parseFloat(body.hourlyRate) : project.hourlyRate,
      currency: body.currency ?? project.currency,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
