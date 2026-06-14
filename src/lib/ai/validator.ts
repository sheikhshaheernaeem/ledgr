/**
 * Strict validator for AI-extracted transactions.
 *
 * Rules (per spec):
 *  - type must be "INCOME" or "EXPENSE"
 *  - amount must be a finite number > 0 (absolute value)
 *  - date must be a parseable ISO-like date
 *  - category must be a non-empty string
 *  - confidence must be ≥ 0.7 (missing confidence → treated as 0.8, since
 *    most LLM outputs are reliable; pure absence isn't a rejection)
 *
 * Returns a discriminated result so callers can branch on success/failure
 * and decide whether to retry the AI call.
 */

import type { ExtractedTransaction } from "./classifier";

export type ValidationResult =
  | { ok: true; valid: ExtractedTransaction[]; rejected: RejectedTransaction[] }
  | { ok: false; reason: string };

export interface RejectedTransaction {
  raw: ExtractedTransaction;
  reasons: string[];
}

const ALLOWED_TYPES = new Set(["INCOME", "EXPENSE"]);
const MIN_CONFIDENCE = 0.7;
const DEFAULT_CONFIDENCE = 0.8;

/**
 * Validate an array of AI-extracted transactions. Returns the subset that
 * passes every rule plus the rejected ones with reasons.
 *
 * If the array itself is empty or undefined, returns { ok: false }.
 */
export function validateAIOutput(
  transactions: ExtractedTransaction[] | undefined | null,
): ValidationResult {
  if (!transactions || !Array.isArray(transactions)) {
    return { ok: false, reason: "AI returned no transactions array" };
  }

  if (transactions.length === 0) {
    return { ok: true, valid: [], rejected: [] };
  }

  const valid: ExtractedTransaction[] = [];
  const rejected: RejectedTransaction[] = [];

  for (const t of transactions) {
    const reasons = checkTransaction(t);
    if (reasons.length === 0) {
      valid.push(t);
    } else {
      rejected.push({ raw: t, reasons });
    }
  }

  return { ok: true, valid, rejected };
}

/**
 * Validate a single transaction. Returns an array of reasons it failed
 * (empty array = passed).
 */
export function checkTransaction(t: ExtractedTransaction): string[] {
  const reasons: string[] = [];

  // type
  const normalizedType = typeof t.type === "string" ? t.type.toUpperCase() : "";
  if (!ALLOWED_TYPES.has(normalizedType)) {
    reasons.push(`type must be INCOME or EXPENSE (got: ${JSON.stringify(t.type)})`);
  }

  // amount
  if (typeof t.amount !== "number" || !Number.isFinite(t.amount)) {
    reasons.push(`amount must be a finite number (got: ${JSON.stringify(t.amount)})`);
  } else if (Math.abs(t.amount) <= 0) {
    reasons.push(`amount must be > 0 (got: ${t.amount})`);
  }

  // date
  if (typeof t.date !== "string" || t.date.length < 4) {
    reasons.push(`date must be an ISO-like string (got: ${JSON.stringify(t.date)})`);
  } else {
    const parsed = new Date(t.date);
    if (isNaN(parsed.getTime())) {
      reasons.push(`date is not parseable (got: ${JSON.stringify(t.date)})`);
    }
  }

  // description
  if (typeof t.description !== "string" || t.description.trim().length === 0) {
    reasons.push(`description must be non-empty`);
  }

  // category
  if (typeof t.category !== "string" || t.category.trim().length === 0) {
    reasons.push(`category must be a non-empty string`);
  }

  // confidence (≥ 0.7)
  const conf = typeof t.confidence === "number" ? t.confidence : DEFAULT_CONFIDENCE;
  if (!Number.isFinite(conf) || conf < MIN_CONFIDENCE) {
    reasons.push(`confidence must be ≥ ${MIN_CONFIDENCE} (got: ${conf})`);
  }

  return reasons;
}

/**
 * Summarize a ValidationResult into a single human-readable status line.
 * Useful for logging and admin diagnostics.
 */
export function summarizeValidation(r: ValidationResult): string {
  if (!r.ok) return `INVALID: ${r.reason}`;
  return `OK: ${r.valid.length} accepted, ${r.rejected.length} rejected`;
}
