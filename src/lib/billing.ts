/**
 * Subscription / billing helpers.
 *
 * Today these are no-Stripe — admins flip user tiers manually via the
 * admin console. The functions are designed so that adding Stripe later
 * is a non-event: swap the body, keep the surface.
 */

import { prisma } from "@/lib/db";
import { TIERS, getTier, type TierKey } from "@/config/tiers";
import { audit } from "@/lib/auditLogs";

export interface BillingResult {
  ok: boolean;
  fromTier?: TierKey;
  toTier?: TierKey;
  message?: string;
}

/**
 * Create / set a user's subscription tier. Idempotent — if they're already
 * on this tier, no-op.
 */
export async function createSubscription(
  userId: string,
  tier: TierKey,
  actorId: string,
): Promise<BillingResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, email: true },
  });
  if (!user) return { ok: false, message: "User not found" };

  const before = getTier(user.subscriptionStatus).slug;
  if (before === tier) return { ok: true, fromTier: before, toTier: tier, message: "No change" };

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: tier },
  });

  await audit({
    action: "billing.create",
    actorId,
    targetUserId: userId,
    entityType: "subscription",
    before: { tier: before },
    after: { tier },
  });

  return { ok: true, fromTier: before, toTier: tier };
}

/**
 * Upgrade or downgrade — same action, different audit type.
 */
export async function changeSubscription(
  userId: string,
  newTier: TierKey,
  actorId: string,
): Promise<BillingResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (!user) return { ok: false, message: "User not found" };

  const before = getTier(user.subscriptionStatus);
  const after = TIERS[newTier];
  if (before.slug === newTier) return { ok: true, fromTier: before.slug, toTier: newTier, message: "Already on this tier" };

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: newTier },
  });

  await audit({
    action: after.priority > before.priority ? "tier.upgrade" : "tier.downgrade",
    actorId,
    targetUserId: userId,
    entityType: "subscription",
    before: { tier: before.slug, priority: before.priority, price: before.price },
    after: { tier: after.slug, priority: after.priority, price: after.price },
  });

  return { ok: true, fromTier: before.slug, toTier: newTier };
}

/**
 * Suspend / cancel a subscription. We don't fully delete — we mark
 * subscriptionStatus to a special "SUSPENDED" value so the user can be
 * reactivated.
 */
export async function cancelSubscription(userId: string, actorId: string): Promise<BillingResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (!user) return { ok: false, message: "User not found" };

  const before = getTier(user.subscriptionStatus).slug;

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "SUSPENDED" },
  });

  await audit({
    action: "tier.suspend",
    actorId,
    targetUserId: userId,
    entityType: "subscription",
    before: { tier: before },
    after: { tier: "SUSPENDED" },
  });

  return { ok: true, fromTier: before };
}

/**
 * Reactivate a suspended account back to the default tier (or specified).
 */
export async function reactivateSubscription(
  userId: string,
  tier: TierKey,
  actorId: string,
): Promise<BillingResult> {
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: tier },
  });

  await audit({
    action: "tier.activate",
    actorId,
    targetUserId: userId,
    entityType: "subscription",
    after: { tier },
  });

  return { ok: true, toTier: tier };
}
