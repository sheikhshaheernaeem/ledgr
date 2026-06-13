import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id as string, role };
}

export async function GET(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");
  const limit = Number(searchParams.get("limit") ?? 50);

  const where: Record<string, unknown> = { operatorId: g.userId };
  if (clientId) where.clientId = clientId;

  const [entries, activeTimer] = await Promise.all([
    prisma.firmTimeEntry.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    }),
    // The currently-running timer (no endedAt) for this operator
    prisma.firmTimeEntry.findFirst({
      where: { operatorId: g.userId, endedAt: null },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ entries, activeTimer });
}

export async function POST(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { clientId, description, category, billableRate, billable } = body as {
    clientId: string; description?: string; category?: string;
    billableRate?: number; billable?: boolean;
  };

  if (!clientId?.trim()) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  // Stop any currently-running timer for this operator first
  await prisma.firmTimeEntry.updateMany({
    where: { operatorId: g.userId, endedAt: null },
    data: {
      endedAt: new Date(),
    },
  });
  // Re-fetch the stopped one and compute duration in a second pass
  const stopped = await prisma.firmTimeEntry.findMany({
    where: { operatorId: g.userId, endedAt: { not: null }, durationSec: null },
  });
  for (const e of stopped) {
    if (e.endedAt) {
      const sec = Math.round((e.endedAt.getTime() - e.startedAt.getTime()) / 1000);
      await prisma.firmTimeEntry.update({ where: { id: e.id }, data: { durationSec: sec } });
    }
  }

  const entry = await prisma.firmTimeEntry.create({
    data: {
      operatorId: g.userId,
      clientId: clientId.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      startedAt: new Date(),
      billableRate: billableRate ?? null,
      billable: billable !== false,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
