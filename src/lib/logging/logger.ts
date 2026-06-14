/**
 * Spec-named alias of the structured pipeline logger. Implementation lives
 * in @/lib/logs/logger.
 *
 * Logs OCR / AI / validation / pipeline failures with stage + level +
 * detail. Surfaces them at /admin/failures.
 */

export {
  logPipelineEvent,
  getRecentFailures,
} from "@/lib/logs/logger";

export type { LogStage, LogLevel, LogEntry } from "@/lib/logs/logger";
