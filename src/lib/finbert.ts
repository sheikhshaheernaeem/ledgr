/**
 * FinBERT (yiyanghkust/finbert-tone) via Hugging Face Inference API.
 *
 * Used on uploaded financial statements / MD&A narrative / earnings text.
 * Returns sentiment label (positive | negative | neutral) + confidence and a
 * lightweight set of derived financial signals.
 *
 * Requires HUGGINGFACE_API_KEY env var. Falls back to a deterministic
 * lexical heuristic if no key is configured (so dev / prototype still works).
 */

const MODEL_ID = "yiyanghkust/finbert-tone";
const HF_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

export type FinSentimentLabel = "positive" | "neutral" | "negative";

export interface FinSentimentResult {
  label: FinSentimentLabel;
  score: number;            // confidence 0..1
  scores: Record<FinSentimentLabel, number>;
  signals: string[];        // lexical financial signals extracted
  highlights: string[];     // most opinionated sentences
  source: "finbert" | "heuristic";
  modelId: string;
  latencyMs: number;
}

const POSITIVE_TERMS = [
  "growth", "increase", "exceed", "outperform", "strong", "record", "expanded",
  "improved", "profitable", "margin expansion", "gain", "upgrade", "guidance raised",
];
const NEGATIVE_TERMS = [
  "decline", "decrease", "miss", "underperform", "weak", "loss", "impairment",
  "downgrade", "headwind", "concern", "writedown", "guidance lowered", "default",
];

function extractSignals(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const t of [...POSITIVE_TERMS, ...NEGATIVE_TERMS]) {
    if (lower.includes(t)) found.add(t);
  }
  return Array.from(found).slice(0, 12);
}

function pickHighlights(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const scored = sentences
    .map((s) => {
      const lower = s.toLowerCase();
      let score = 0;
      for (const t of POSITIVE_TERMS) if (lower.includes(t)) score++;
      for (const t of NEGATIVE_TERMS) if (lower.includes(t)) score++;
      return { s: s.trim(), score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.s);
}

function heuristicSentiment(text: string, started: number): FinSentimentResult {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  for (const t of POSITIVE_TERMS) if (lower.includes(t)) pos++;
  for (const t of NEGATIVE_TERMS) if (lower.includes(t)) neg++;
  const total = Math.max(pos + neg, 1);
  const posScore = pos / total;
  const negScore = neg / total;
  const neuScore = Math.max(0.05, 1 - posScore - negScore);
  const scores: Record<FinSentimentLabel, number> = {
    positive: posScore, negative: negScore, neutral: neuScore,
  };
  const label = (Object.keys(scores) as FinSentimentLabel[]).reduce(
    (a, b) => (scores[a] >= scores[b] ? a : b),
  );
  return {
    label,
    score: scores[label],
    scores,
    signals: extractSignals(text),
    highlights: pickHighlights(text),
    source: "heuristic",
    modelId: "lexical-heuristic",
    latencyMs: Date.now() - started,
  };
}

interface HFResponse {
  label: string;
  score: number;
}

export async function analyzeFinancialSentiment(text: string): Promise<FinSentimentResult> {
  const started = Date.now();
  const trimmed = text.trim().slice(0, 4000);
  if (trimmed.length < 10) {
    return {
      label: "neutral", score: 1, scores: { positive: 0, negative: 0, neutral: 1 },
      signals: [], highlights: [], source: "heuristic", modelId: "empty-input",
      latencyMs: Date.now() - started,
    };
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return heuristicSentiment(trimmed, started);

  try {
    const res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: trimmed,
        options: { wait_for_model: true },
      }),
    });
    if (!res.ok) return heuristicSentiment(trimmed, started);
    const data: HFResponse[][] | HFResponse[] = await res.json();
    const rows = Array.isArray(data[0]) ? (data[0] as HFResponse[]) : (data as HFResponse[]);
    const scores: Record<FinSentimentLabel, number> = { positive: 0, negative: 0, neutral: 0 };
    for (const r of rows) {
      const key = r.label.toLowerCase();
      if (key === "positive" || key === "negative" || key === "neutral") {
        scores[key] = r.score;
      }
    }
    const label = (Object.keys(scores) as FinSentimentLabel[]).reduce(
      (a, b) => (scores[a] >= scores[b] ? a : b),
    );
    return {
      label,
      score: scores[label],
      scores,
      signals: extractSignals(trimmed),
      highlights: pickHighlights(trimmed),
      source: "finbert",
      modelId: MODEL_ID,
      latencyMs: Date.now() - started,
    };
  } catch {
    return heuristicSentiment(trimmed, started);
  }
}
