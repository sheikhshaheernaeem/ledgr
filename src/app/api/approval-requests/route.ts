import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "PENDING";

  const requests = await prisma.approvalRequest.findMany({
    where: { userId: session.user.id, status },
    include: {
      workflow: true,
      actions: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workflowId, entityType, entityId, amount, notes } = body;

  const workflow = await prisma.approvalWorkflow.findFirst({ where: { id: workflowId, userId: session.user.id } });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const req = await prisma.approvalRequest.create({
    data: {
      workflowId,
      userId: session.user.id,
      entityType,
      entityId,
      currentStep: 1,
      status: "PENDING",
      submittedBy: session.user.email || session.user.id,
      amount: amount ? parseFloat(amount) : null,
      notes: notes || null,
    },
    include: { workflow: true },
  });

  return NextResponse.json(req, { status: 201 });
}
