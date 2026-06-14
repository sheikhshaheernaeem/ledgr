/**
 * POST /api/demo/trigger
 *
 * "Show me the autonomous flow" one-click demo. Creates a virtual sample
 * document and runs it through the full pipeline asynchronously. The
 * LiveSummary widget on /client picks up the new transactions via its 3s poll.
 *
 * No file upload required — used to demonstrate the upload-→-classify-→-summary
 * flow without the user needing a real document.
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processDocument } from "@/lib/pipeline/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

// Realistic sample bank-statement text with 5 transactions across categories.
const SAMPLE_TEXT = `Acme Tech Inc — Bank Statement
Account: ****4729
Period: March 2026

2026-03-01  STRIPE PAYOUT                            +4,250.00
2026-03-02  AWS — EC2 + S3                            -312.40
2026-03-04  WEWORK MEMBERSHIP                          -650.00
2026-03-07  CONSULTING — ACME ENTERPRISES         +1,800.00
2026-03-09  GOOGLE WORKSPACE                            -18.00
2026-03-12  PROFESSIONAL LIABILITY INSURANCE        -425.00
2026-03-15  CLIENT PAYMENT — GLOBAL CORP          +5,500.00
2026-03-18  ZOOM ENTERPRISE                          -179.00
2026-03-22  RENT — Q1 OFFICE                       -2,400.00
2026-03-28  STRIPE PAYOUT                            +3,920.00`;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Create a virtual Document with the sample text as the "content"
  const doc = await prisma.document.create({
    data: {
      userId,
      name: `Sample bank statement — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      type: "STATEMENT",
      mimeType: "text/plain",
      content: `data:text/plain;base64,${Buffer.from(SAMPLE_TEXT).toString("base64")}`,
      storageProvider: "db_base64",
      fileSize: SAMPLE_TEXT.length,
      status: "UPLOADED",
    },
    select: { id: true },
  });

  // Trigger the pipeline in the background. waitUntil keeps the lambda
  // alive long enough to finish without blocking the HTTP response.
  waitUntil(
    processDocument(doc.id, { clientText: SAMPLE_TEXT }).catch((err) => {
      console.error(`[demo:trigger] pipeline failed for ${doc.id}:`, err);
    }),
  );

  return NextResponse.json({
    documentId: doc.id,
    status: "processing",
    message: "Sample document submitted. Watch the live summary update in ~5 seconds.",
  });
}
