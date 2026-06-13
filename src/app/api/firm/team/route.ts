import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function adminGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { userId: session.user.id as string };
}

// GET /api/firm/team — list operators with their assigned clients + workload
export async function GET() {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const operators = await prisma.user.findMany({
    where: { role: { in: ["ACCOUNTANT", "ADMIN"] } },
    select: {
      id: true, name: true, email: true, role: true,
      _count: { select: { managedClients: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const timeAgg = await prisma.firmTimeEntry.groupBy({
    by: ["operatorId"],
    where: { startedAt: { gte: thirtyDaysAgo }, durationSec: { not: null } },
    _sum: { durationSec: true },
  });
  const timeMap = new Map(timeAgg.map((t) => [t.operatorId, t._sum.durationSec ?? 0]));

  const result = operators.map((op) => ({
    id: op.id,
    name: op.name,
    email: op.email,
    role: op.role,
    clientCount: op._count.managedClients,
    hoursLast30Days: Math.round((timeMap.get(op.id) ?? 0) / 3600 * 10) / 10,
  }));

  return NextResponse.json(result);
}

// POST /api/firm/team — assign a client to an operator
export async function POST(req: NextRequest) {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { accountantId, clientId } = body as { accountantId: string; clientId: string };
  if (!accountantId || !clientId) return NextResponse.json({ error: "accountantId and clientId required" }, { status: 400 });

  const existing = await prisma.managedClient.findUnique({
    where: { accountantId_clientId: { accountantId, clientId } },
  });
  if (existing) {
    const reactivated = await prisma.managedClient.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return NextResponse.json(reactivated);
  }
  const created = await prisma.managedClient.create({
    data: { accountantId, clientId, isActive: true },
  });
  return NextResponse.json(created, { status: 201 });
}

// DELETE /api/firm/team?accountantId=&clientId= — unassign
export async function DELETE(req: NextRequest) {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const { searchParams } = req.nextUrl;
  const accountantId = searchParams.get("accountantId");
  const clientId = searchParams.get("clientId");
  if (!accountantId || !clientId) return NextResponse.json({ error: "accountantId and clientId required" }, { status: 400 });

  await prisma.managedClient.updateMany({
    where: { accountantId, clientId },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
