import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const wf = await prisma.approvalWorkflow.findFirst({ where: { id, userId: session.user.id } });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const steps = await prisma.approvalStep.findMany({
    where: { workflowId: id },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json(steps);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const wf = await prisma.approvalWorkflow.findFirst({ where: { id, userId: session.user.id } });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { stepOrder, approverRole, approverEmail, minAmount, maxAmount } = body;

  const step = await prisma.approvalStep.create({
    data: {
      workflowId: id,
      stepOrder: stepOrder || 1,
      approverRole,
      approverEmail: approverEmail || null,
      minAmount: minAmount ? parseFloat(minAmount) : null,
      maxAmount: maxAmount ? parseFloat(maxAmount) : null,
    },
  });

  return NextResponse.json(step, { status: 201 });
}
