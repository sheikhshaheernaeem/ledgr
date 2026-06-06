import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.plaidConnection.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: {
      id: true,
      institutionName: true,
      status: true,
      lastSyncAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(connections);
}
