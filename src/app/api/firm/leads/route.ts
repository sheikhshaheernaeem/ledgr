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

export async function GET() {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const leads = await prisma.firmLead.findMany({
    where: (g.role === "ADMIN" || g.role === "QA") ? {} : { ownerId: g.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { name, email, phone, companyName, source, stage, estimatedMrr, notes } = body as Record<string, string | number | undefined>;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const lead = await prisma.firmLead.create({
    data: {
      ownerId: g.userId,
      name: name.trim(),
      email: typeof email === "string" ? email.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      companyName: typeof companyName === "string" ? companyName.trim() || null : null,
      source: typeof source === "string" ? source.trim() || null : null,
      stage: (typeof stage === "string" && stage) || "NEW",
      estimatedMrr: typeof estimatedMrr === "number" ? estimatedMrr : null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
    },
  });
  return NextResponse.json(lead, { status: 201 });
}
