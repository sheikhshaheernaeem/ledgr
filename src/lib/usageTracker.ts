/**
 * Usage tracking against the subscription tier's limits.
 *
 * Counts are derived from DB facts (Document + Transaction + AiAnalysis rows
 * within the current billing month). No separate counter table — that way
 * usage can never drift from reality.
 */

import { prisma } from "@/lib/db";
import { getTier, TIERS, type TierKey, type Tier } from "@/config/tiers";

export type UsageType = "documents" | "transactions" | "ai_calls";

export interface UsageSnapshot {
  userId: string;
  tier: TierKey;
  periodStart: Date;
  periodEnd: Date;
  documents: { used: number; limit: number; remaining: number };
  transactions: { used: number; limit: number; remaining: number };
  aiCalls: { used: number; limit: number; remaining: number };
}

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  type: UsageType;
  tier: TierKey;
  reason?: string;
}

/**
 * Returns the current billing month bounds. Uses calendar months for
 * simplicity (so "limit resets monthly" is implicit).
 */
export function currentPeriod(): { start: Date; end: Date } {
   
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Read full usage snapshot for a user against their current tier.
 */
export async function getUsage(userId: string): Promise<UsageSnapshot> {
  const { start, end } = currentPeriod();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  const tier = getTier(user?.subscriptionStatus);

  const [documents, transactions, aiCalls] = await Promise.all([
    prisma.document.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.transaction.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.aiAnalysis.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
  ]);

  return {
    userId,
    tier: tier.slug,
    periodStart: start,
    periodEnd: end,
    documents: makeStat(documents, tier.documentLimit),
    transactions: makeStat(transactions, tier.transactionLimit),
    aiCalls: makeStat(aiCalls, tier.documentLimit * 3), // soft proxy
  };
}

/**
 * Hot path — does this user have headroom in `type`? Used by /api/upload
 * and any other write endpoint before doing work.
 */
export async function checkLimit(userId: string, type: UsageType): Promise<LimitCheck> {
  const usage = await getUsage(userId);
  const stat = type === "documents" ? usage.documents
             : type === "transactions" ? usage.transactions
             : usage.aiCalls;

  const allowed = stat.used < stat.limit;
  return {
    allowed,
    used: stat.used,
    limit: stat.limit,
    remaining: stat.remaining,
    type,
    tier: usage.tier,
    reason: allowed ? undefined : `${type} limit reached for ${usage.tier} tier (${stat.used}/${stat.limit === Infinity ? "∞" : stat.limit})`,
  };
}

/**
 * Optional helper — not used as a counter (we count facts), but useful for
 * incrementing a fast cache later if usage ever moves off the DB.
 *
 * Today this is a no-op so the call sites are future-proof.
 */
export async function incrementUsage(_userId: string, _type: UsageType): Promise<void> {
  // Intentionally empty. Document/Transaction/AiAnalysis rows ARE the counters.
}

/**
 * Same-family tiers strictly above the caller's current priority. Used by
 * the upload-blocked error response and the UpgradeRequired card.
 */
export function getUpgradeOptions(currentTier: TierKey): Array<{
  slug: TierKey;
  displayName: string;
  price: number;
  documentLimit: number;
  transactionLimit: number;
}> {
  const here = getTier(currentTier);
  return (Object.values(TIERS) as Tier[])
    .filter((t) => t.family === here.family && t.priority > here.priority)
    .map((t) => ({
      slug: t.slug,
      displayName: t.displayName,
      price: t.price,
      documentLimit: t.documentLimit,
      transactionLimit: t.transactionLimit,
    }));
}

function makeStat(used: number, limit: number) {
  return {
    used,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
  };
}
