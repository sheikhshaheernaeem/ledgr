import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const workflow = await prisma.approvalWorkflow.findFirst({
    where: { id, userId: session.user.id },
    include: { steps: { orderBy: { stepOrder: "asc" } }, requests: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workflow);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const wf = await prisma.approvalWorkflow.findFirst({ where: { id, userId: session.user.id } });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.approvalWorkflow.update({
    where: { id },
    data: {
      name: body.name ?? wf.name,
      entityType: body.entityType ?? wf.entityType,
      isActive: body.isActive !== undefined ? body.isActive : wf.isActive,
    },
    include: { steps: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const wf = await prisma.approvalWorkflow.findFirst({ where: { id, userId: session.user.id } });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.approvalWorkflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
