/**
 * Feature gating — answers "is THIS user allowed to use THIS feature?"
 *
 * Reads the user's current tier from User.subscriptionStatus and consults
 * the TIERS source of truth. Use this anywhere code branches on plan tier:
 *
 *   const access = await checkFeatureAccess(userId, "forecasting");
 *   if (!access.allowed) return jsonError(403, access);
 */

import { prisma } from "@/lib/db";
import { getTier, type Feature, type TierKey } from "@/config/tiers";

export interface AccessResult {
  allowed: boolean;
  feature: Feature;
  tier: TierKey;
  /** When blocked: upgrade target slugs that include this feature. */
  upgradeOptions?: Array<{ slug: TierKey; displayName: string; price: number }>;
  reason?: string;
}

/**
 * Check whether the user's current tier includes `feature`.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
): Promise<AccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, role: true },
  });

  // Admins always pass — they need to investigate anything.
  if (user?.role === "ADMIN") {
    const tier = getTier(user.subscriptionStatus);
    return { allowed: true, feature, tier: tier.slug };
  }

  const tier = getTier(user?.subscriptionStatus);
  const allowed = tier.features.includes(feature);
  if (allowed) return { allowed: true, feature, tier: tier.slug };

  const upgrades = await findUpgradesContaining(feature, tier.slug);
  return {
    allowed: false,
    feature,
    tier: tier.slug,
    upgradeOptions: upgrades,
    reason: `Feature "${feature}" is not included in your ${tier.displayName} plan.`,
  };
}

/**
 * Synchronous variant — pass an already-known tier slug (e.g. from a session).
 */
export function checkFeatureAccessSync(tierSlug: string | null | undefined, feature: Feature): AccessResult {
  const tier = getTier(tierSlug);
  const allowed = tier.features.includes(feature);
  if (allowed) return { allowed: true, feature, tier: tier.slug };
  return {
    allowed: false,
    feature,
    tier: tier.slug,
    reason: `Feature "${feature}" is not included in your ${tier.displayName} plan.`,
  };
}

async function findUpgradesContaining(feature: Feature, fromSlug: TierKey) {
  const { TIERS } = await import("@/config/tiers");
  const from = TIERS[fromSlug];
  return Object.values(TIERS)
    .filter((t) =>
      t.family === from.family
      && t.priority > from.priority
      && t.features.includes(feature))
    .map((t) => ({ slug: t.slug, displayName: t.displayName, price: t.price }));
}
