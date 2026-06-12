import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, stripeId: true, startedAt: true, expiresAt: true },
  });

  return NextResponse.json({
    plan: sub?.plan ?? "STARTER",
    status: sub?.status ?? "ACTIVE",
    stripeId: sub?.stripeId ?? null,
    startedAt: sub?.startedAt ?? null,
    expiresAt: sub?.expiresAt ?? null,
  });
}
