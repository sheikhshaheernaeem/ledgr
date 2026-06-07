import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const costs = await prisma.projectCost.findMany({
    where: { projectId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(costs);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { date, description, category, amount, billable } = body;

  const cost = await prisma.projectCost.create({
    data: {
      projectId: id,
      userId: session.user.id,
      date: new Date(date),
      description,
      category: category || "LABOR",
      amount: parseFloat(amount),
      billable: billable !== undefined ? billable : true,
    },
  });

  return NextResponse.json(cost, { status: 201 });
}
