import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountantId = session.user.id as string;

  const managedClients = await prisma.managedClient.findMany({
    where: { accountantId, isActive: true },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(managedClients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountantId = session.user.id as string;

  const body = await req.json();
  const { clientEmail } = body as { clientEmail: string };

  if (!clientEmail) return NextResponse.json({ error: "clientEmail is required" }, { status: 400 });

  const clientUser = await prisma.user.findUnique({ where: { email: clientEmail.toLowerCase().trim() } });
  if (!clientUser) {
    return NextResponse.json({ error: "No Ledgr account found for this email" }, { status: 404 });
  }

  if (clientUser.id === accountantId) {
    return NextResponse.json({ error: "You cannot add yourself as a client" }, { status: 400 });
  }

  // Check if already linked
  const existing = await prisma.managedClient.findUnique({
    where: { accountantId_clientId: { accountantId, clientId: clientUser.id } },
  });

  if (existing) {
    if (existing.isActive) {
      return NextResponse.json({ error: "This client is already in your firm" }, { status: 409 });
    }
    // Re-activate if previously removed
    const reactivated = await prisma.managedClient.update({
      where: { id: existing.id },
      data: { isActive: true },
      include: { client: { select: { id: true, name: true, email: true, companyName: true, createdAt: true } } },
    });
    return NextResponse.json(reactivated, { status: 200 });
  }

  const managedClient = await prisma.managedClient.create({
    data: { accountantId, clientId: clientUser.id },
    include: { client: { select: { id: true, name: true, email: true, companyName: true, createdAt: true } } },
  });

  return NextResponse.json(managedClient, { status: 201 });
}
