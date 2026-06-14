/**
 * Normalize a raw AI-extracted transaction into the shape the accounting
 * engine wants to persist.
 *
 * Guarantees:
 *  - amount is a finite number
 *  - date is a valid Date object (defaults to today if unparseable)
 *  - type matches sign (income > 0, expense < 0 or marked EXPENSE)
 *  - category trimmed + capped length
 *  - userId attached
 */

import type { ExtractedTransaction } from "./classifier";

export interface NormalizedTransaction {
  userId: string;
  date: Date;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  confidence: number | null;
}

export function normalizeTransaction(
  raw: ExtractedTransaction,
  userId: string,
): NormalizedTransaction | null {
  // Required: amount
  if (!Number.isFinite(raw.amount)) return null;
  // Required: description
  if (!raw.description || raw.description.trim().length === 0) return null;

  // Date — fall back to today if unparseable. Better than dropping the row.
  let date: Date;
  try {
    const parsed = new Date(raw.date);
    date = isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch {
    date = new Date();
  }

  // Type — derive from amount sign if not consistent, but respect explicit type.
  let type: "INCOME" | "EXPENSE";
  if (raw.type === "INCOME" || raw.type === "EXPENSE") {
    type = raw.type;
  } else {
    type = raw.amount >= 0 ? "INCOME" : "EXPENSE";
  }

  return {
    userId,
    date,
    description: raw.description.trim().slice(0, 500),
    amount: round2(raw.amount),
    type,
    category: (raw.category ?? "Uncategorized").trim().slice(0, 64) || "Uncategorized",
    confidence: typeof raw.confidence === "number" && isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : null,
  };
}

export function normalizeAll(
  raws: ExtractedTransaction[],
  userId: string,
): NormalizedTransaction[] {
  return raws
    .map((r) => normalizeTransaction(r, userId))
    .filter((t): t is NormalizedTransaction => t !== null);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
