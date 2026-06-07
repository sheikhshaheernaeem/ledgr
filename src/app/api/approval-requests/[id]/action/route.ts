import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const req = await prisma.approvalRequest.findFirst({
    where: { id, userId: session.user.id },
    include: { workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
  });

  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (req.status !== "PENDING") return NextResponse.json({ error: "Request is not pending" }, { status: 400 });

  const body = await request.json();
  const { action, notes } = body; // APPROVED | REJECTED

  if (!["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Must be APPROVED or REJECTED" }, { status: 400 });
  }

  // Record the action
  await prisma.approvalAction.create({
    data: {
      requestId: id,
      step: req.currentStep,
      action,
      actorId: session.user.id,
      actorEmail: session.user.email || session.user.id,
      notes: notes || null,
    },
  });

  const totalSteps = req.workflow.steps.length;
  let newStatus = req.status;
  let newStep = req.currentStep;

  if (action === "REJECTED") {
    newStatus = "REJECTED";
  } else if (action === "APPROVED") {
    if (req.currentStep >= totalSteps) {
      newStatus = "APPROVED";
    } else {
      newStep = req.currentStep + 1;
    }
  }

  const updated = await prisma.approvalRequest.update({
    where: { id },
    data: { status: newStatus, currentStep: newStep },
    include: { workflow: true, actions: true },
  });

  return NextResponse.json(updated);
}
