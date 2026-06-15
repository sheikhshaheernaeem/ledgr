/**
 * SOURCE OF TRUTH for every subscription tier.
 *
 * Every feature check, every limit enforcement, every billing decision
 * imports from here. There is no other place that knows what a plan costs
 * or what's included.
 *
 * Tier slugs MATCH the database storage convention (User.subscriptionStatus):
 *   AI_STARTER, AI_GROWTH, AI_CFO  (the AI tier — display as "Autonomous AI")
 *   STARTER, GROWTH, CFO           (the bookkeeping tier — Basic/Pro/Advanced)
 *
 * If you change a price or limit here, every gate in the app updates next
 * deploy. No code grep required.
 */

export type TierKey =
  | "AI_STARTER"
  | "AI_GROWTH"
  | "AI_CFO"
  | "STARTER"
  | "GROWTH"
  | "CFO";

export type Family = "ai" | "bookkeeping";

export interface Tier {
  slug: TierKey;
  family: Family;
  displayName: string;
  shortName: string;
  price: number;                       // USD / month
  documentLimit: number;               // per month (Infinity = unlimited)
  transactionLimit: number;            // per month (Infinity = unlimited)
  automationLevel: number;             // 0..1
  features: Feature[];
  priority: 1 | 2 | 3;                 // 3 = highest (Autonomous AI), 1 = lowest
  /** Slug used in the landing page CTA, register form, and Stripe one day. */
  registerSlug: string;
}

export type Feature =
  | "auto_bookkeeping"
  | "basic_reports"
  | "dashboard"
  | "real_time_reports"
  | "cashflow"
  | "anomaly_detection"
  | "multi_user"
  | "full_autonomy"
  | "forecasting"
  | "advanced_analytics"
  | "priority_processing"
  | "ai_insights"
  | "manual_bookkeeping"
  | "weekly_updates"
  | "dedicated_bookkeeper"
  | "real_time_updates"
  | "tax_reports";

export const TIERS: Record<TierKey, Tier> = {
  AI_STARTER: {
    slug: "AI_STARTER",
    family: "ai",
    displayName: "Starter AI",
    shortName: "Starter",
    price: 999,
    documentLimit: 200,
    transactionLimit: 5000,
    automationLevel: 0.8,
    features: [
      "auto_bookkeeping",
      "basic_reports",
      "dashboard",
    ],
    priority: 1,
    registerSlug: "ai-starter",
  },
  AI_GROWTH: {
    slug: "AI_GROWTH",
    family: "ai",
    displayName: "Growth AI",
    shortName: "Growth",
    price: 1999,
    documentLimit: 1000,
    transactionLimit: 25000,
    automationLevel: 0.95,
    features: [
      "auto_bookkeeping",
      "real_time_reports",
      "cashflow",
      "anomaly_detection",
      "multi_user",
      "dashboard",
    ],
    priority: 2,
    registerSlug: "ai-growth",
  },
  AI_CFO: {
    slug: "AI_CFO",
    family: "ai",
    displayName: "Autonomous AI",
    shortName: "Autonomous",
    price: 2999,
    documentLimit: Infinity,
    transactionLimit: Infinity,
    automationLevel: 1,
    features: [
      "full_autonomy",
      "forecasting",
      "advanced_analytics",
      "priority_processing",
      "ai_insights",
      "auto_bookkeeping",
      "real_time_reports",
      "cashflow",
      "anomaly_detection",
      "multi_user",
      "dashboard",
    ],
    priority: 3,
    registerSlug: "ai-cfo",
  },
  STARTER: {
    slug: "STARTER",
    family: "bookkeeping",
    displayName: "Basic",
    shortName: "Basic",
    price: 299,
    documentLimit: 50,
    transactionLimit: 100,
    automationLevel: 0,
    features: ["manual_bookkeeping"],
    priority: 1,
    registerSlug: "starter",
  },
  GROWTH: {
    slug: "GROWTH",
    family: "bookkeeping",
    displayName: "Pro",
    shortName: "Pro",
    price: 599,
    documentLimit: 200,
    transactionLimit: 500,
    automationLevel: 0,
    features: ["manual_bookkeeping", "weekly_updates"],
    priority: 2,
    registerSlug: "growth",
  },
  CFO: {
    slug: "CFO",
    family: "bookkeeping",
    displayName: "Advanced",
    shortName: "Advanced",
    price: 1499,
    documentLimit: Infinity,
    transactionLimit: Infinity,
    automationLevel: 0,
    features: [
      "manual_bookkeeping",
      "dedicated_bookkeeper",
      "real_time_updates",
      "tax_reports",
      "weekly_updates",
    ],
    priority: 3,
    registerSlug: "cfo",
  },
};

export const ALL_TIERS: Tier[] = Object.values(TIERS);
export const AI_TIERS: Tier[] = ALL_TIERS.filter((t) => t.family === "ai");
export const BOOKKEEPING_TIERS: Tier[] = ALL_TIERS.filter((t) => t.family === "bookkeeping");

/** Default tier for a brand-new client. */
export const DEFAULT_TIER: TierKey = "AI_STARTER";

/**
 * Normalize anything stored in User.subscriptionStatus into a known TierKey.
 * Returns the default if the value is unknown or null.
 */
export function resolveTier(raw: string | null | undefined): TierKey {
  if (!raw) return DEFAULT_TIER;
  const upper = raw.toUpperCase().replace(/-/g, "_");
  return (upper in TIERS) ? (upper as TierKey) : DEFAULT_TIER;
}

/**
 * Lookup by tier key with a safe fallback.
 */
export function getTier(raw: string | null | undefined): Tier {
  return TIERS[resolveTier(raw)];
}

/**
 * Pretty price formatter — Infinity shown as "unlimited".
 */
export function fmtLimit(n: number): string {
  return n === Infinity ? "unlimited" : n.toLocaleString();
}
