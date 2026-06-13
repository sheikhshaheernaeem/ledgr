import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = session.user.id as string;

  const requests = await prisma.clientServiceRequest.findMany({
    where: {
      assignedToId: userId,
      status: { in: ["ALLOCATED", "IN_PROGRESS"] },
    },
    orderBy: [{ urgency: "desc" }, { allocatedAt: "asc" }],
  });

  // Fetch client info
  const clientIds = [...new Set(requests.map((r) => r.clientId))];
  const clients = await prisma.user.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, email: true, companyName: true },
  });

  return NextResponse.json({ requests, clients });
}
