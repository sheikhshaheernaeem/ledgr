/**
 * Llama 3.3 70B (via Groq) prompt-driven extraction of financial transactions
 * from raw document text. Returns structured JSON, validated.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export const TransactionSchema = z.object({
  date: z.string(),                                    // YYYY-MM-DD
  description: z.string(),
  amount: z.number(),                                  // signed: negative = expense, positive = income
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string(),                                // e.g. "SaaS", "Salaries", "Revenue", "Travel"
  confidence: z.number().min(0).max(1).optional(),     // model self-rated confidence
});

export const ExtractionSchema = z.object({
  documentType: z.string(),                            // e.g. "bank_statement" | "invoice" | "receipt"
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

export async function extractTransactionsFromText(rawText: string): Promise<ExtractionResult> {
  const trimmed = rawText.trim().slice(0, 30_000); // safety cap

  if (trimmed.length < 20) {
    return { documentType: "unknown", detectedCurrency: "USD", transactions: [], notes: "Document text too short to extract." };
  }

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all transactions from this document:\n\n${trimmed}`,
    temperature: 0.1,
    maxTokens: 4000,
  });

  // Strip code fences if the model ignored instructions
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  // Try to find JSON object boundaries if there's any preamble
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 || lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      documentType: "unknown",
      detectedCurrency: "USD",
      transactions: [],
      notes: "Model returned non-JSON output. Could not extract.",
    };
  }

  const validated = ExtractionSchema.safeParse(parsed);
  if (!validated.success) {
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

  return validated.data;
}
