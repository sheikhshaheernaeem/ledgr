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

// GET /api/admin/dispatch — all client service requests with client + accountant context
export async function GET() {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const [requests, clients, accountants] = await Promise.all([
    prisma.clientServiceRequest.findMany({
      orderBy: [{ status: "asc" }, { urgency: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, email: true, companyName: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ACCOUNTANT", "ADMIN"] } },
      select: {
        id: true, name: true, email: true, role: true,
        _count: { select: { managedClients: { where: { isActive: true } } } },
      },
    }),
  ]);

  return NextResponse.json({ requests, clients, accountants });
}

// PATCH /api/admin/dispatch — allocate a request to an accountant
export async function PATCH(req: NextRequest) {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { requestId, assignedToId, dueAt, status } = body as {
    requestId: string;
    assignedToId?: string | null;
    dueAt?: string | null;
    status?: string;
  };

  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (assignedToId !== undefined) {
    data.assignedToId = assignedToId || null;
    if (assignedToId) {
      data.allocatedAt = new Date();
      data.allocatedById = g.userId;
      data.status = "ALLOCATED";
    } else {
      data.status = "OPEN";
    }
  }
  if (dueAt !== undefined) data.dueAt = dueAt ? new Date(dueAt) : null;
  if (status !== undefined) data.status = status;

  const updated = await prisma.clientServiceRequest.update({ where: { id: requestId }, data });
  return NextResponse.json(updated);
}
