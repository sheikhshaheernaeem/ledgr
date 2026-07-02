import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id as string, role };
}

export async function GET(req: NextRequest) {
  const gate = await operatorGate();
  if ("error" in gate) return gate.error;

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { ownerId: gate.userId };
  if (clientId === "null") where.clientId = null;
  else if (clientId) where.clientId = clientId;
  if (status) where.status = status;

  const tasks = await prisma.firmTask.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const gate = await operatorGate();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const { title, description, clientId, dueAt, priority, category } = body as {
    title: string; description?: string; clientId?: string;
    dueAt?: string; priority?: string; category?: string;
  };

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const task = await prisma.firmTask.create({
    data: {
      ownerId: gate.userId,
      title: title.trim(),
      description: description?.trim() || null,
      clientId: clientId?.trim() || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      priority: priority || "MED",
      category: category?.trim() || null,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
