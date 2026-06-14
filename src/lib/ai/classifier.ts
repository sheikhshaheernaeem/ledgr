/**
 * AI classification agent — converts raw document text into structured
 * transactions via Llama 3.3 70B (Groq).
 *
 * Strict JSON. Self-validating via Zod. Retries with backoff on transient
 * or malformed responses.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export const TransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export const ExtractionSchema = z.object({
  documentType: z.string(),
  detectedCurrency: z.string().default("USD"),
  transactions: z.array(TransactionSchema),
  notes: z.string().optional(),
});

export type ExtractedTransaction = z.infer<typeof TransactionSchema>;
export type ExtractionResult = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are an expert accounting AI. Extract structured financial transactions from the document text.

Rules:
- Return ONLY valid JSON. No markdown, no code fences, no commentary.
- Use ISO date format YYYY-MM-DD. If only month/day visible, assume current year.
- Expenses are NEGATIVE numbers, income is POSITIVE.
- "type" is "INCOME" or "EXPENSE" (matches amount sign).
- Choose a precise "category" from typical accounting buckets: Revenue, Salaries, Rent, Utilities, SaaS, Travel, Marketing, Office, Insurance, Professional Services, Taxes, Bank Fees, Cost of Goods Sold, Other Income, Other Expense.
- Skip non-transaction lines (headers, balances, totals, dividers).
- Include a "confidence" 0-1 for each transaction (your self-rated certainty).
- If you cannot find ANY transactions, return {"documentType":"unknown","transactions":[]}.

Output schema:
{
  "documentType": "bank_statement" | "invoice" | "receipt" | "general_ledger" | "unknown",
  "detectedCurrency": "USD" | "EUR" | "GBP" | "CAD" | ...,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": -123.45,
      "type": "EXPENSE",
      "category": "SaaS",
      "confidence": 0.92
    }
  ],
  "notes": "optional brief observation"
}`;

const MAX_RETRIES = 2;

/**
 * Classify a chunk of financial text into structured transactions.
 * Retries up to 2 times on transient or malformed output.
 */
export async function classifyTransaction(rawText: string): Promise<ExtractionResult> {
  const trimmed = rawText.trim().slice(0, 30_000);
  if (trimmed.length < 20) {
    return {
      documentType: "unknown",
      detectedCurrency: "USD",
      transactions: [],
      notes: "Document text too short to extract.",
    };
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: SYSTEM_PROMPT,
        prompt: attempt === 0
          ? `Extract all transactions from this document:\n\n${trimmed}`
          : `Your previous response was not valid JSON. Try again. Output ONLY JSON, no prose, no code fences.\n\nDocument:\n\n${trimmed}`,
        temperature: 0.1,
        maxTokens: 4000,
      });

      const parsed = parseAndValidate(text);
      if (parsed) return parsed;

      // Invalid → backoff and retry
      await sleep(300 * (attempt + 1));
    } catch (err) {
      lastError = err;
      await sleep(500 * (attempt + 1));
    }
  }

  console.warn("[classifier] all retries failed:", lastError);
  return {
    documentType: "unknown",
    detectedCurrency: "USD",
    transactions: [],
    notes: "AI classification failed after retries.",
  };
}

function parseAndValidate(text: string): ExtractionResult | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0) return null;
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return null; }

  const validated = ExtractionSchema.safeParse(parsed);
  if (validated.success) return validated.data;

  // Be lenient — keep what we can
  const partial = parsed as Partial<ExtractionResult>;
  return {
    documentType: typeof partial.documentType === "string" ? partial.documentType : "unknown",
    detectedCurrency: typeof partial.detectedCurrency === "string" ? partial.detectedCurrency : "USD",
    transactions: Array.isArray(partial.transactions)
      ? (partial.transactions as ExtractedTransaction[]).filter(
          (t) => t && typeof t.date === "string" && typeof t.amount === "number" && typeof t.description === "string",
        )
      : [],
    notes: typeof partial.notes === "string" ? partial.notes : undefined,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
