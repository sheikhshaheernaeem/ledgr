import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      client: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { tasks: true, costs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, code, description, clientId, departmentId, status, startDate, endDate, budget, billingType, hourlyRate, currency } = body;

    if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        code: code.toUpperCase(),
        description: description || null,
        clientId: clientId || null,
        departmentId: departmentId || null,
        status: status || "ACTIVE",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        billingType: billingType || "FIXED",
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency: currency || "USD",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Project code already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
