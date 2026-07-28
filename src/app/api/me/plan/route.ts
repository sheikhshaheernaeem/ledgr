import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const subs = await prisma.subscription.findMany({
    where: { userId },
    select: { family: true, plan: true, status: true, stripeId: true, startedAt: true, expiresAt: true },
  });

  if (subs.length === 0) {
    return NextResponse.json({
      subscriptions: [{ family: "bookkeeping", plan: "STARTER", status: "ACTIVE", stripeId: null, startedAt: null, expiresAt: null }],
    });
  }

  return NextResponse.json({ subscriptions: subs });
}
