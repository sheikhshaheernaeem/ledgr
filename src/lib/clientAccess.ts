/**
 * Which product families (AI Accountant / Book keeping) a CLIENT account
 * actually has access to. Backed by the per-family `Subscription` rows —
 * see prisma/schema.prisma. Used to gate the client portal and to decide
 * where a user lands after login.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

const FAMILY_HOME: Record<Family, string> = { ai: "/ai/client", bookkeeping: "/bookkeeping/client" };
const OTHER_FAMILY: Record<Family, Family> = { ai: "bookkeeping", bookkeeping: "ai" };

/**
 * Internal (ADMIN/QA) accounts that may preview the client portal despite
 * not holding a CLIENT role — e.g. the founder's own login or a reviewer
 * account, so they can see both AI Accountant and Book keeping as a
 * customer would without a separate throwaway account.
 */
const CLIENT_PORTAL_PREVIEW_EMAILS = new Set(["admin@ledgr.app", "yc-review@ledgr.app"]);

export function canPreviewClientPortal(email: string | null | undefined): boolean {
  return !!email && CLIENT_PORTAL_PREVIEW_EMAILS.has(email);
}

/**
 * Auth + role + family gate for the /ai/client and /bookkeeping/client route
 * trees — one call per layout closes the direct-URL family-crossing gap that
 * used to let e.g. an AI-only client load bookkeeping data by URL alone.
 */
export async function requireClientFamily(family: Family) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT" && !canPreviewClientPortal(session.user.email)) redirect("/dashboard");

  const userId = session.user.id as string;
  const families = await getUserFamilies(userId);
  if (!families.includes(family)) {
    redirect(families.includes(OTHER_FAMILY[family]) ? FAMILY_HOME[OTHER_FAMILY[family]] : `/${family}/register`);
  }

  return { userId, userEmail: session.user.email ?? "user", families };
}
