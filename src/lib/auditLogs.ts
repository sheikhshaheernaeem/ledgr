/**
 * Structured audit logging for admin + billing actions.
 *
 * Persists to the existing AuditLog table so we don't fragment audit data.
 * Use this wrapper instead of writing AuditLog rows directly — keeps
 * action names consistent + makes it easy to grep history later.
 */

import { prisma } from "@/lib/db";

export type AuditAction =
  | "tier.upgrade"
  | "tier.downgrade"
  | "tier.suspend"
  | "tier.activate"
  | "tier.override"
  | "usage.reset"
  | "user.delete"
  | "user.verify"
  | "billing.create"
  | "billing.cancel"
  | "pipeline.retry"
  | "pipeline.fix"
  | "admin.login";

export interface AuditEntry {
  action: AuditAction;
  actorId: string;                 // who did it (usually an admin)
  targetUserId?: string | null;    // who it was done to
  entityType?: string;             // e.g. "user" | "subscription" | "document"
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

/**
 * Record an audit log. Best-effort — failures here never bubble back to
 * the caller. Use for any admin action that touches another user, billing,
 * or tier.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType ?? "user",
        entityId: entry.targetUserId ?? entry.actorId,
        before: entry.before !== undefined ? safeStringify(entry.before) : null,
        after: entry.after !== undefined ? safeStringify(entry.after) : null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.warn("[audit] persist failed", err);
  }
}

/**
 * Read recent admin actions. Used by /admin/billing and /admin/audit views.
 */
export async function getRecentAudit(limit = 50) {
  return prisma.auditLog.findMany({
    where: {
      action: { in: [
        "tier.upgrade", "tier.downgrade", "tier.suspend",
        "tier.activate", "tier.override", "usage.reset",
        "user.delete", "billing.create", "billing.cancel",
        "pipeline.retry", "pipeline.fix",
      ] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 8000);
  } catch {
    return String(value).slice(0, 8000);
  }
}
