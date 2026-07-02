import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function gate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const userId = session.user.id as string;
  const lead = await prisma.firmLead.findUnique({ where: { id } });
  if (!lead) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (lead.ownerId !== userId && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId, role, lead };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["name", "email", "phone", "companyName", "source", "stage", "notes"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.estimatedMrr !== undefined) data.estimatedMrr = body.estimatedMrr;
  if (body.lastContactAt !== undefined) data.lastContactAt = body.lastContactAt ? new Date(body.lastContactAt) : null;
  if (body.stage === "WON" && !g.lead.convertedAt) data.convertedAt = new Date();
  if (body.stage === "LOST" || body.stage === "NEW") data.convertedAt = null;

  const updated = await prisma.firmLead.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  await prisma.firmLead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
