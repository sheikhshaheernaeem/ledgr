/**
 * Shared single-shot text completion via Groq / Llama 3.3 70B — the app's
 * working AI provider. Used to replace the Gemini calls that were failing on a
 * free-tier key with zero quota. Groq is fast, free-tier friendly, and already
 * powers document classification.
 */
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });
const MODEL = "llama-3.3-70b-versatile";

/** True when a Groq key is configured (i.e. real AI is available). */
export function aiTextEnabled(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== "demo-mode";
}

export interface AiTextOpts {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Run a prompt through Groq and return trimmed text. Throws on provider error. */
export async function aiText(prompt: string, opts: AiTextOpts = {}): Promise<string> {
  const { text } = await generateText({
    model: groq(MODEL),
    ...(opts.system ? { system: opts.system } : {}),
    prompt,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 2000,
  });
  return text.trim();
}
