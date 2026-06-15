/**
 * POST /api/admin/users/[id]/tier
 *
 * Admin sets a user's tier. Validates the slug against TIERS, calls
 * billing.changeSubscription which audits the change.
 *
 * Body: { tier: "AI_STARTER" | ... | "SUSPENDED" }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { TIERS, type TierKey } from "@/config/tiers";
import {
  changeSubscription,
  cancelSubscription,
  reactivateSubscription,
} from "@/lib/billing";

const VALID_TIER_KEYS = Object.keys(TIERS) as TierKey[];

const Schema = z.object({
  tier: z.string(), // validated below
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const wanted = parsed.data.tier.toUpperCase().replace(/-/g, "_");

  if (wanted === "SUSPENDED") {
    const result = await cancelSubscription(id, session.user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (!VALID_TIER_KEYS.includes(wanted as TierKey)) {
    return NextResponse.json({ error: `Unknown tier: ${parsed.data.tier}` }, { status: 400 });
  }

  // If the user was suspended, reactivate; otherwise change.
  const { prisma } = await import("@/lib/db");
  const current = await prisma.user.findUnique({
    where: { id }, select: { subscriptionStatus: true },
  });

  const result = current?.subscriptionStatus === "SUSPENDED"
    ? await reactivateSubscription(id, wanted as TierKey, session.user.id)
    : await changeSubscription(id, wanted as TierKey, session.user.id);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
