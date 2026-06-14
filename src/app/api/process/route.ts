/**
 * GET  /api/process?documentId=<id>  → poll current status
 * POST /api/process                    → manually re-run the pipeline
 *
 * GET: lightweight status check + summary.
 * POST: { documentId, clientText? } → re-runs the pipeline (e.g. after
 * earlier OCR/AI failure).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processDocument } from "@/lib/pipeline/processDocument";
import { calculateSummary } from "@/lib/accounting/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
    select: { id: true, name: true, status: true, updatedAt: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pull recent transactions linked via the most-recent AiAnalysis for this doc
  const lastAnalysis = await prisma.aiAnalysis.findFirst({
    where: { documentId: doc.id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, latencyMs: true, label: true, score: true, createdAt: true },
  });

  const summary = doc.status === "PROCESSED"
    ? await calculateSummary(session.user.id)
    : null;

  return NextResponse.json({
    document: doc,
    analysis: lastAnalysis,
    summary,
  });
}

const PostSchema = z.object({
  documentId: z.string().min(1),
  clientText: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Authorize: doc must belong to caller
  const doc = await prisma.document.findFirst({
    where: { id: parsed.data.documentId, userId: session.user.id },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await processDocument(parsed.data.documentId, {
      clientText: parsed.data.clientText,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
