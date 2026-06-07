import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scenarios = await prisma.cashFlowScenario.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scenarios);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, assumptions, forecastJson } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const scenario = await prisma.cashFlowScenario.create({
    data: {
      userId: session.user.id,
      name,
      description: description || null,
      assumptions: typeof assumptions === "string" ? assumptions : JSON.stringify(assumptions || {}),
      forecastJson: typeof forecastJson === "string" ? forecastJson : JSON.stringify(forecastJson || []),
    },
  });

  return NextResponse.json(scenario, { status: 201 });
}
