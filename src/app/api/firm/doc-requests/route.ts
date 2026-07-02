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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const userId = session.user.id as string;

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");

  // CLIENT users only see their own requests
  if (role === "CLIENT") {
    const requests = await prisma.documentRequest.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (clientId) {
    const requests = await prisma.documentRequest.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  // All requests this operator can see
  const requests = await prisma.documentRequest.findMany({
    where: (role === "ADMIN" || role === "QA") ? {} : { requesterId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { clientId, title, description, items, dueAt } = body as {
    clientId: string;
    title: string;
    description?: string;
    items: Array<{ label: string }>;
    dueAt?: string;
  };

  if (!clientId?.trim() || !title?.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "clientId, title, items required" }, { status: 400 });
  }

  const itemsWithStatus = items.map((it) => ({ label: it.label, status: "pending" as const }));

  const request = await prisma.documentRequest.create({
    data: {
      requesterId: g.userId,
      clientId: clientId.trim(),
      title: title.trim(),
      description: description?.trim() || null,
      itemsJson: JSON.stringify(itemsWithStatus),
      status: "OPEN",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  return NextResponse.json(request, { status: 201 });
}
