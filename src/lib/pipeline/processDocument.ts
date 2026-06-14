/**
 * Pipeline orchestrator — the single function that turns an uploaded
 * Document into persisted Transactions + an AiAnalysis row.
 *
 * Flow:
 *   1. Fetch document
 *   2. extractTextFromDocument()        ← OCR / pdf-parse / text decode
 *   3. classifyTransaction()            ← Llama 3.3 → structured JSON
 *   4. normalizeTransaction()           ← validate + shape for DB
 *   5. addTransactionsBatch()           ← persist atomically
 *   6. mark Document status PROCESSED
 *
 * Returns the structured transactions + an updated summary.
 *
 * Safe to call inline (waitUntil) or from a manual /api/process retry.
 */

import { prisma } from "@/lib/db";
import { extractTextFromDocument } from "@/lib/ocr/extract";
import { classifyWithSelfHealing } from "@/lib/ai/selfHealing";
import { validateAIOutput, summarizeValidation } from "@/lib/ai/validator";
import { normalizeAll } from "@/lib/ai/transform";
import { addTransactionsBatch, calculateSummary, type Summary } from "@/lib/accounting/engine";
import { analyzeFinancialSentiment } from "@/lib/finbert";
import { logPipelineEvent } from "@/lib/logs/logger";
import { failureGuard } from "@/lib/monitoring/failureGuard";

export interface PipelineStep {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

export interface PipelineResult {
  documentId: string;
  transactionIds: string[];
  transactionCount: number;
  summary: Summary;
  sentiment: Awaited<ReturnType<typeof analyzeFinancialSentiment>>;
  steps: PipelineStep[];
}

interface Options {
  /** Optional client-provided OCR text (e.g. Tesseract output from the browser). */
  clientText?: string;
}

export async function processDocument(documentId: string, opts: Options = {}): Promise<PipelineResult> {
  const steps: PipelineStep[] = [];
  const tick = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try {
      const out = await fn();
      steps.push({ name, ok: true, ms: Date.now() - t0 });
      return out;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      steps.push({ name, ok: false, ms: Date.now() - t0, detail });
      throw err;
    }
  };

  // ── 1. Fetch document
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true, userId: true, name: true, mimeType: true,
      fileUrl: true, content: true, storageProvider: true,
    },
  });
  if (!doc) throw new Error(`Document ${documentId} not found`);
  if (!doc.userId) throw new Error(`Document ${documentId} missing userId`);

  await prisma.document.update({ where: { id: documentId }, data: { status: "PROCESSING" } });

  try {
    // ── 2. Extract text (with built-in fallbacks based on URL kind)
    const urlForOcr = doc.fileUrl ?? doc.content ?? "";
    if (!urlForOcr) throw new Error(`Document ${documentId} has no file URL or content`);

    const ocr = await tick("ocr_extract", () =>
      failureGuard(
        "ocr",
        () => extractTextFromDocument(urlForOcr, {
          contentType: doc.mimeType,
          clientText: opts.clientText,
        }),
        {
          userId: doc.userId, documentId: doc.id, retries: 1,
          isValid: (r: unknown) => {
            const ocr = r as { text: string };
            return Boolean(ocr.text && ocr.text.trim().length >= 20);
          },
        },
      ),
    );

    // ── 3. Classify with self-healing (cleans text + retries on empty result)
    const healed = await tick("ai_classify", () => classifyWithSelfHealing(ocr.text));
    const extraction = healed.extraction;
    if (healed.attempts > 1) {
      await logPipelineEvent({
        stage: "ai_classify", level: "info",
        message: `Self-healing converged on attempt ${healed.attempts}`,
        userId: doc.userId, documentId: doc.id,
        detail: { healLog: healed.healLog },
      });
    }

    // ── 4. Validate AI output. Up to 2 retry passes if everything is rejected.
    let validation = await tick("ai_validate", async () => validateAIOutput(extraction.transactions));
    let retryCount = 0;
    while (validation.ok && validation.valid.length === 0 && extraction.transactions.length > 0 && retryCount < 2) {
      retryCount++;
      await logPipelineEvent({
        stage: "ai_validate",
        level: "warn",
        message: `Validation rejected all ${extraction.transactions.length} transactions, retry ${retryCount}/2`,
        userId: doc.userId,
        documentId: doc.id,
        detail: validation.rejected.slice(0, 3),
      });
      const retried = await classifyWithSelfHealing(ocr.text);
      extraction.transactions = retried.extraction.transactions;
      validation = validateAIOutput(retried.extraction.transactions);
    }

    if (!validation.ok) {
      await logPipelineEvent({
        stage: "ai_validate",
        level: "error",
        message: `Validation failure: ${validation.reason}`,
        userId: doc.userId,
        documentId: doc.id,
      });
      throw new Error(`Validation failed: ${validation.reason}`);
    }

    if (validation.rejected.length > 0) {
      await logPipelineEvent({
        stage: "ai_validate",
        level: "warn",
        message: `Rejected ${validation.rejected.length} of ${extraction.transactions.length} transactions: ${summarizeValidation(validation)}`,
        userId: doc.userId,
        documentId: doc.id,
        detail: validation.rejected.slice(0, 10),
      });
    }

    // ── 5. Normalize (only the validated set)
    const normalized = normalizeAll(validation.valid, doc.userId);

    // ── 5. Persist transactions atomically
    const transactionIds = await tick("persist_transactions", () =>
      addTransactionsBatch(normalized, `Extracted by Llama 3.3 from ${doc.name}.`),
    );

    // ── 6. Run FinBERT sentiment (non-fatal if it fails)
    const sentiment = await tick("finbert_sentiment", () =>
      analyzeFinancialSentiment(ocr.text),
    ).catch(() => null);

    // ── 7. Compute summary
    const summary = await tick("compute_summary", () => calculateSummary(doc.userId));

    // ── 8. Persist AiAnalysis row tying everything together
    await prisma.aiAnalysis.create({
      data: {
        userId: doc.userId,
        documentId: doc.id,
        kind: "extraction",
        source: sentiment?.source ?? "llama",
        modelId: `llama-3.3-70b${sentiment ? ` + ${sentiment.modelId}` : ""}`,
        inputText: ocr.text.slice(0, 4000),
        label: sentiment?.label ?? null,
        score: sentiment?.score ?? null,
        scoresJson: sentiment ? JSON.stringify(sentiment.scores) : null,
        signalsJson: sentiment ? JSON.stringify(sentiment.signals) : null,
        highlightsJson: sentiment ? JSON.stringify(sentiment.highlights) : null,
        latencyMs: steps.reduce((s, x) => s + x.ms, 0),
      },
    }).catch((err) => {
      console.warn("[pipeline] AiAnalysis persist failed:", err);
    });

    // ── 9. Mark document processed
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSED" },
    });

    return {
      documentId,
      transactionIds,
      transactionCount: transactionIds.length,
      summary,
      sentiment: sentiment ?? {
        label: "neutral",
        score: 1,
        scores: { positive: 0, neutral: 1, negative: 0 },
        signals: [],
        highlights: [],
        source: "heuristic",
        modelId: "skipped",
        latencyMs: 0,
      },
      steps,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logPipelineEvent({
      stage: "pipeline",
      level: "error",
      message: `processDocument failed: ${message}`,
      userId: doc.userId,
      documentId: doc.id,
      detail: { steps, errorName: err instanceof Error ? err.name : "unknown" },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    }).catch(() => {});
    throw err;
  }
}
