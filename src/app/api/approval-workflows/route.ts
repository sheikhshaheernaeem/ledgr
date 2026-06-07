import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.approvalWorkflow.findMany({
    where: { userId: session.user.id },
    include: { steps: { orderBy: { stepOrder: "asc" } }, _count: { select: { requests: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, entityType, steps } = body;

  if (!name || !entityType) return NextResponse.json({ error: "Name and entityType are required" }, { status: 400 });

  const workflow = await prisma.approvalWorkflow.create({
    data: {
      userId: session.user.id,
      name,
      entityType,
      steps: steps
        ? {
            create: steps.map((s: { approverRole: string; approverEmail?: string; minAmount?: number; maxAmount?: number }, i: number) => ({
              stepOrder: i + 1,
              approverRole: s.approverRole,
              approverEmail: s.approverEmail || null,
              minAmount: s.minAmount || null,
              maxAmount: s.maxAmount || null,
            })),
          }
        : undefined,
    },
    include: { steps: true },
  });

  return NextResponse.json(workflow, { status: 201 });
}
