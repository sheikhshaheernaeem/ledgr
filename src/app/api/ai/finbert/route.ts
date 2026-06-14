import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeFinancialSentiment } from "@/lib/finbert";

const Schema = z.object({
  text: z.string().min(10).max(8000),
  requestId: z.string().optional(),
  documentId: z.string().optional(),
});

/**
 * POST /api/ai/finbert
 * Run FinBERT (or heuristic fallback) on financial text and persist the result.
 *
 * Auth required. Result is owned by the caller.
 * Optionally links to a ClientServiceRequest or Document.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { text, requestId, documentId } = parsed.data;

  // If a requestId is provided, enforce that caller is either the owner client,
  // the assigned accountant, or admin.
  if (requestId) {
    const r = await prisma.clientServiceRequest.findUnique({
      where: { id: requestId },
      select: { clientId: true, assignedToId: true },
    });
    if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const role = (session.user as { role?: string }).role;
    if (r.clientId !== userId && r.assignedToId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await analyzeFinancialSentiment(text);

  const saved = await prisma.aiAnalysis.create({
    data: {
      userId,
      requestId: requestId ?? null,
      documentId: documentId ?? null,
      kind: "sentiment",
      source: result.source,
      modelId: result.modelId,
      inputText: text.slice(0, 4000),
      label: result.label,
      score: result.score,
      scoresJson: JSON.stringify(result.scores),
      signalsJson: JSON.stringify(result.signals),
      highlightsJson: JSON.stringify(result.highlights),
      latencyMs: result.latencyMs,
    },
  });

  return NextResponse.json({
    id: saved.id,
    label: result.label,
    score: result.score,
    scores: result.scores,
    signals: result.signals,
    highlights: result.highlights,
    source: result.source,
    modelId: result.modelId,
    latencyMs: result.latencyMs,
  });
}
