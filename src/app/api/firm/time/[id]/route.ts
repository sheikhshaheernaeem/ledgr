import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function gate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const entry = await prisma.firmTimeEntry.findUnique({ where: { id } });
  if (!entry) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { userId: session.user.id as string, role, entry };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.billable !== undefined) data.billable = !!body.billable;
  if (body.billableRate !== undefined) data.billableRate = body.billableRate;
  if (body.invoiced !== undefined) data.invoiced = !!body.invoiced;

  // STOP action — sets endedAt and computes durationSec
  if (body.stop === true && !g.entry.endedAt) {
    const endedAt = new Date();
    data.endedAt = endedAt;
    data.durationSec = Math.round((endedAt.getTime() - g.entry.startedAt.getTime()) / 1000);
  }

  const updated = await prisma.firmTimeEntry.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  if (g.entry.operatorId !== g.userId && g.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.firmTimeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
