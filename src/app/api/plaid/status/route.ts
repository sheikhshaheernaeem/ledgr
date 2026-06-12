import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/plaid/status
 * Reports whether Plaid is configured (server keys present) and whether the
 * current user has any active connections.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const configured = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  const env = process.env.PLAID_ENV ?? "sandbox";

  const connections = await prisma.plaidConnection.findMany({
    where: { userId },
    select: { id: true, institutionName: true, status: true, lastSyncAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    configured,
    env,
    connectionsCount: connections.length,
    connections,
  });
}
