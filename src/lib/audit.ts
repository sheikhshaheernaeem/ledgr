import { prisma } from "@/lib/db";

interface WriteAuditParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  transactionId?: string;
  ipAddress?: string;
}

export async function writeAudit({
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
  transactionId,
  ipAddress,
}: WriteAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      before: before !== undefined ? JSON.stringify(before) : undefined,
      after: after !== undefined ? JSON.stringify(after) : undefined,
      transactionId: transactionId ?? undefined,
      ipAddress: ipAddress ?? undefined,
    },
  });
}
