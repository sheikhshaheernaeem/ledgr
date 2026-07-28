/**
 * Which product families (AI Accountant / Book keeping) a CLIENT account
 * actually has access to. Backed by the per-family `Subscription` rows —
 * see prisma/schema.prisma. Used to gate the client portal and to decide
 * where a user lands after login.
 */

import { prisma } from "@/lib/db";
import type { Family } from "@/config/tiers";

export async function getUserFamilies(userId: string): Promise<Family[]> {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: "ACTIVE" },
    select: { family: true },
  });
  return subs
    .map((s) => s.family)
    .filter((f): f is Family => f === "ai" || f === "bookkeeping");
}
