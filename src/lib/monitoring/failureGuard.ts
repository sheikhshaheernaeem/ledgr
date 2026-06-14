/**
 * Generic retry-with-log wrapper. Wraps any async step so the pipeline can
 * never silently fail and is consistent about how it handles transient errors.
 *
 * Usage:
 *   const result = await failureGuard("ai_classify", async () => {
 *     return classifyTransaction(text);
 *   }, { userId, documentId, retries: 2 });
 *
 * On exception:
 *   - logs each retry with stage + error
 *   - returns the final exception to the caller (which decides whether to
 *     mark the document FAILED or continue with a fallback)
 */

import { logPipelineEvent, type LogStage } from "@/lib/logs/logger";

export interface GuardOptions {
  userId?: string | null;
  documentId?: string | null;
  retries?: number;        // total attempts = retries + 1
  backoffMs?: number;      // initial backoff
  /** Optional predicate — if it returns false on result, retry. */
  isValid?: (result: unknown) => boolean;
}

export class GuardError extends Error {
  constructor(message: string, public stage: LogStage, public cause?: unknown) {
    super(message);
    this.name = "GuardError";
  }
}

/**
 * Run `fn` with up to `retries` extra attempts on throw or invalid result.
 * Logs every failure (warn for retries, error for the final one).
 */
export async function failureGuard<T>(
  stage: LogStage,
  fn: () => Promise<T>,
  opts: GuardOptions = {},
): Promise<T> {
  const maxAttempts = (opts.retries ?? 2) + 1;
  const backoff = opts.backoffMs ?? 300;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (opts.isValid && !opts.isValid(result)) {
        const message = `Step "${stage}" returned invalid result (attempt ${attempt}/${maxAttempts})`;
        if (attempt < maxAttempts) {
          await logPipelineEvent({
            stage, level: "warn", message,
            userId: opts.userId, documentId: opts.documentId,
          });
          await sleep(backoff * attempt);
          continue;
        }
        await logPipelineEvent({
          stage, level: "error", message,
          userId: opts.userId, documentId: opts.documentId,
        });
        throw new GuardError(message, stage);
      }
      // success
      if (attempt > 1) {
        await logPipelineEvent({
          stage, level: "info",
          message: `Step "${stage}" recovered on attempt ${attempt}/${maxAttempts}`,
          userId: opts.userId, documentId: opts.documentId,
        });
      }
      return result;
    } catch (err) {
      lastError = err;
      const detail = err instanceof Error ? err.message : String(err);

      if (attempt < maxAttempts) {
        await logPipelineEvent({
          stage, level: "warn",
          message: `Step "${stage}" failed (attempt ${attempt}/${maxAttempts}): ${detail}`,
          userId: opts.userId, documentId: opts.documentId,
        });
        await sleep(backoff * attempt);
        continue;
      }

      await logPipelineEvent({
        stage, level: "error",
        message: `Step "${stage}" failed after ${maxAttempts} attempts: ${detail}`,
        userId: opts.userId, documentId: opts.documentId,
        detail: { errorName: err instanceof Error ? err.name : "unknown" },
      });
      throw new GuardError(`Step "${stage}" failed after ${maxAttempts} attempts: ${detail}`, stage, lastError);
    }
  }

  // unreachable
  throw new GuardError(`Step "${stage}" failed (unreachable)`, stage, lastError);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
