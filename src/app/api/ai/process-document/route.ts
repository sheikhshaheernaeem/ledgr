import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDocument } from "@/lib/doc-parse";
import { extractTransactionsFromText } from "@/lib/ai-extract";
import { analyzeFinancialSentiment } from "@/lib/finbert";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PipelineStep {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

/**
 * POST /api/ai/process-document
 *
 * Multipart form with one of:
 *   file: PDF / CSV / TXT (server-parsed)
 *   text: raw text (e.g. from client-side OCR on an image)
 *
 * Returns:
 *   transactions[], totals, sentiment, signals, steps[]
 *
 * Persists every accepted transaction to the Transaction table and stores a
 * single AiAnalysis row for the FinBERT result.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const steps: PipelineStep[] = [];
  const tick = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try {
      const out = await fn();
      steps.push({ name, ok: true, ms: Date.now() - t0 });
      return out;
    } catch (err) {
      steps.push({ name, ok: false, ms: Date.now() - t0, detail: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  };

  let rawText = "";
  let sourceName = "pasted-text";
  let sourceMime = "text/plain";
  let sourcePages: number | undefined;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const pastedText = form.get("text");

    if (file instanceof File && file.size > 0) {
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
      }
      sourceName = file.name;
      const parsed = await tick("parse_document", () => parseDocument(file));
      rawText = parsed.text;
      sourceMime = parsed.mimeType;
      sourcePages = parsed.pages;
    } else if (typeof pastedText === "string" && pastedText.trim().length > 0) {
      rawText = pastedText.trim();
      sourceName = "pasted-text";
    } else {
      return NextResponse.json({ error: "Provide either a file or text" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse document", steps },
      { status: 400 },
    );
  }

  if (rawText.trim().length < 20) {
    return NextResponse.json(
      { error: "Document text too short to process (< 20 chars).", steps },
      { status: 422 },
    );
  }

  // ── Extract structured transactions via Llama 3.3 ──
  let extraction;
  try {
    extraction = await tick("extract_transactions", () => extractTransactionsFromText(rawText));
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI extraction failed: " + (err instanceof Error ? err.message : String(err)),
        steps,
      },
      { status: 502 },
    );
  }

  // ── FinBERT sentiment on the same text ──
  const sentiment = await tick("finbert_sentiment", () => analyzeFinancialSentiment(rawText));

  // ── Persist transactions ──
  const savedTxnIds: string[] = [];
  const savedTransactions = await tick("persist_transactions", async () => {
    const created: typeof extraction.transactions[number][] = [];
    for (const t of extraction.transactions) {
      try {
        const parsedDate = new Date(t.date);
        const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        const txn = await prisma.transaction.create({
          data: {
            userId,
            date,
            description: t.description.slice(0, 500),
            amount: t.amount,
            type: t.type,
            category: t.category.slice(0, 64),
            confidence: t.confidence ?? null,
            status: "AI_CATEGORIZED",
            aiNotes: `Extracted by Llama 3.3 from ${sourceName}.`,
          },
        });
        savedTxnIds.push(txn.id);
        created.push(t);
      } catch {
        // skip individual failures; pipeline continues
      }
    }
    return created;
  });

  // ── Compute totals ──
  let totalIncome = 0, totalExpenses = 0;
  for (const t of savedTransactions) {
    if (t.type === "INCOME" || t.amount > 0) totalIncome += Math.abs(t.amount);
    else totalExpenses += Math.abs(t.amount);
  }
  const netProfit = totalIncome - totalExpenses;

  // Category breakdown
  const byCategory: Record<string, { income: number; expense: number; count: number }> = {};
  for (const t of savedTransactions) {
    const key = t.category || "Uncategorized";
    if (!byCategory[key]) byCategory[key] = { income: 0, expense: 0, count: 0 };
    if (t.type === "INCOME" || t.amount > 0) byCategory[key].income += Math.abs(t.amount);
    else byCategory[key].expense += Math.abs(t.amount);
    byCategory[key].count++;
  }

  // ── Persist single AiAnalysis row tying everything together ──
  let analysisId: string | null = null;
  try {
    const a = await prisma.aiAnalysis.create({
      data: {
        userId,
        kind: "extraction",
        source: sentiment.source,
        modelId: `llama-3.3-70b + ${sentiment.modelId}`,
        inputText: rawText.slice(0, 4000),
        label: sentiment.label,
        score: sentiment.score,
        scoresJson: JSON.stringify(sentiment.scores),
        signalsJson: JSON.stringify(sentiment.signals),
        highlightsJson: JSON.stringify(sentiment.highlights),
        latencyMs: steps.reduce((s, x) => s + x.ms, 0),
      },
    });
    analysisId = a.id;
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    success: true,
    source: { name: sourceName, mimeType: sourceMime, pages: sourcePages, chars: rawText.length },
    extraction: {
      documentType: extraction.documentType,
      detectedCurrency: extraction.detectedCurrency,
      notes: extraction.notes,
      count: savedTransactions.length,
    },
    transactions: savedTransactions,
    transactionIds: savedTxnIds,
    totals: {
      income: round(totalIncome),
      expenses: round(totalExpenses),
      netProfit: round(netProfit),
    },
    byCategory,
    sentiment: {
      label: sentiment.label,
      score: sentiment.score,
      scores: sentiment.scores,
      signals: sentiment.signals,
      highlights: sentiment.highlights,
      source: sentiment.source,
      modelId: sentiment.modelId,
    },
    analysisId,
    steps,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
