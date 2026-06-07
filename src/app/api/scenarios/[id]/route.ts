import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scenario = await prisma.cashFlowScenario.findFirst({ where: { id, userId: session.user.id } });
  if (!scenario) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(scenario);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scenario = await prisma.cashFlowScenario.findFirst({ where: { id, userId: session.user.id } });
  if (!scenario) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.cashFlowScenario.update({
    where: { id },
    data: {
      name: body.name ?? scenario.name,
      description: body.description !== undefined ? body.description : scenario.description,
      assumptions: body.assumptions ? (typeof body.assumptions === "string" ? body.assumptions : JSON.stringify(body.assumptions)) : scenario.assumptions,
      forecastJson: body.forecastJson ? (typeof body.forecastJson === "string" ? body.forecastJson : JSON.stringify(body.forecastJson)) : scenario.forecastJson,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scenario = await prisma.cashFlowScenario.findFirst({ where: { id, userId: session.user.id } });
  if (!scenario) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cashFlowScenario.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
