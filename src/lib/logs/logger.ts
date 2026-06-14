/**
 * Pipeline logger — persists OCR / AI / validation failures so admins can
 * see what went wrong and where, and so we can surface a "failed documents"
 * view per client.
 *
 * Use sparingly — only for events that need persistence. Routine debug
 * goes to console.
 */

import { prisma } from "@/lib/db";

export type LogStage =
  | "ocr"
  | "ai_classify"
  | "ai_validate"
  | "normalize"
  | "persist"
  | "summary"
  | "pipeline"
  | "unknown";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  stage: LogStage;
  level?: LogLevel;
  message: string;
  userId?: string | null;
  documentId?: string | null;
  detail?: Record<string, unknown> | string | unknown[];
}

/**
 * Record a structured log entry. Best-effort — failures here never bubble
 * to the caller. Also writes to console for live tailing.
 */
export async function logPipelineEvent(entry: LogEntry): Promise<void> {
  const level = entry.level ?? "error";
  const consoleLine = `[pipeline:${entry.stage}:${level}] ${entry.message}`;

  if (level === "error") console.error(consoleLine, entry.detail ?? "");
  else if (level === "warn") console.warn(consoleLine, entry.detail ?? "");
  else console.log(consoleLine, entry.detail ?? "");

  try {
    await prisma.pipelineLog.create({
      data: {
        stage: entry.stage,
        level,
        message: entry.message.slice(0, 2000),
        userId: entry.userId ?? null,
        documentId: entry.documentId ?? null,
        detailJson: entry.detail ? safeStringify(entry.detail) : null,
      },
    });
  } catch (err) {
    // Logging must never crash the caller
    console.warn("[pipeline:logger] persist failed", err);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 8000);
  } catch {
    return String(value).slice(0, 8000);
  }
}

/**
 * Retrieve recent failure logs. Used by the admin failures view.
 */
export async function getRecentFailures(opts: { limit?: number; userId?: string } = {}) {
  return prisma.pipelineLog.findMany({
    where: {
      level: "error",
      ...(opts.userId ? { userId: opts.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}
