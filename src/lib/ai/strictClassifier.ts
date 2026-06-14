/**
 * Spec-named alias of the strict AI classifier.
 *
 * The implementation lives in ./classifier — this file is the spec-compliant
 * import path (`@/lib/ai/strictClassifier`).
 *
 * The classifier itself enforces:
 *   - Strict JSON output, no free text
 *   - 2 retries on malformed responses
 *   - Schema validation via Zod
 */

export {
  classifyTransaction,
  TransactionSchema,
  ExtractionSchema,
} from "./classifier";

export type {
  ExtractedTransaction,
  ExtractionResult,
} from "./classifier";
