/**
 * Self-healing AI classification layer.
 *
 * Wraps classifyTransaction with progressive recovery strategies. If the
 * classifier returns no valid transactions, this layer:
 *   1. Cleans the input text more aggressively each pass
 *   2. Trims edge whitespace, removes control chars, collapses runs
 *   3. Re-runs classification
 *   4. Caps total attempts at 3
 *
 * If all attempts fail, returns an empty result with a heal log so callers
 * can decide whether to mark the document FAILED or accept zero
 * transactions.
 */

import { classifyTransaction, type ExtractionResult } from "./classifier";

const MAX_HEAL_ATTEMPTS = 3;

export interface SelfHealResult {
  extraction: ExtractionResult;
  attempts: number;
  healLog: string[];
}

/**
 * Run classification with self-healing. Each attempt applies progressively
 * stronger text cleaning before re-running the AI.
 */
export async function classifyWithSelfHealing(rawText: string): Promise<SelfHealResult> {
  const healLog: string[] = [];
  let current = rawText;
  let extraction: ExtractionResult = {
    documentType: "unknown",
    detectedCurrency: "USD",
    transactions: [],
  };

  for (let attempt = 1; attempt <= MAX_HEAL_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      current = clean(current, attempt);
      healLog.push(`attempt_${attempt}: applied cleaning level ${attempt}`);
    }

    try {
      extraction = await classifyTransaction(current);
      if (extraction.transactions.length > 0) {
        if (attempt > 1) healLog.push(`attempt_${attempt}: recovered ${extraction.transactions.length} txns`);
        return { extraction, attempts: attempt, healLog };
      }
      healLog.push(`attempt_${attempt}: 0 txns, retrying with stronger cleaning`);
    } catch (err) {
      healLog.push(`attempt_${attempt}: classifier threw — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  healLog.push(`exhausted ${MAX_HEAL_ATTEMPTS} attempts, returning empty result`);
  return { extraction, attempts: MAX_HEAL_ATTEMPTS, healLog };
}

/**
 * Progressively stronger cleaning. Attempt 2 strips control chars; attempt 3
 * additionally collapses whitespace runs and removes lines that look like
 * pure headers/separators.
 */
function clean(text: string, level: number): string {
  let out = text;

  if (level >= 2) {
    // Remove control chars + zero-width + non-printable
    // eslint-disable-next-line no-control-regex
    out = out.replace(/[\x00-\x08\x0B-\x1F\x7F​-‍﻿]/g, "");
    // Strip trailing whitespace on each line
    out = out.split("\n").map((l) => l.trimEnd()).join("\n");
  }

  if (level >= 3) {
    // Collapse 3+ blank lines, remove decorative separators
    out = out.replace(/\n{3,}/g, "\n\n");
    out = out
      .split("\n")
      .filter((l) => !/^[-=*_~]{3,}$/.test(l.trim()))
      .join("\n");
    // Collapse multiple spaces inside lines
    out = out.split("\n").map((l) => l.replace(/ {2,}/g, "  ")).join("\n");
  }

  return out;
}
