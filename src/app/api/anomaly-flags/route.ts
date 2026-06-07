import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dismissed = searchParams.get("dismissed") === "true";

  const flags = await prisma.anomalyFlag.findMany({
    where: { userId: session.user.id, dismissed },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(flags);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { transactionId, entityType, entityId, reason, severity, riskScore } = body;

  const flag = await prisma.anomalyFlag.create({
    data: {
      userId: session.user.id,
      transactionId: transactionId || null,
      entityType,
      entityId,
      reason,
      severity: severity || "MEDIUM",
      riskScore: riskScore || 0.5,
    },
  });

  return NextResponse.json(flag, { status: 201 });
}
