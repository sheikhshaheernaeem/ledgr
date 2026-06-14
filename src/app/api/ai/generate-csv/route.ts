import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Schema = z.object({
  transactionIds: z.array(z.string()).min(1).max(5000).optional(),
  reportId: z.string().optional(),
  scope: z.enum(["all", "selected", "report"]).default("selected"),
});

/**
 * POST /api/ai/generate-csv
 *
 * Returns transactions as a properly quoted CSV for accountants / tax filing.
 *
 * Scope:
 *   - "selected": uses transactionIds
 *   - "report": uses reportId → all txns linked to that report
 *   - "all": every txn for this user (use with care)
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { transactionIds, reportId, scope } = parsed.data;

  let where: { userId: string; id?: { in: string[] }; reportId?: string } = { userId };
  if (scope === "selected") {
    if (!transactionIds?.length) return NextResponse.json({ error: "transactionIds required for selected scope" }, { status: 400 });
    where = { userId, id: { in: transactionIds } };
  } else if (scope === "report") {
    if (!reportId) return NextResponse.json({ error: "reportId required for report scope" }, { status: 400 });
    where = { userId, reportId };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      date: true, description: true, amount: true, type: true,
      category: true, subcategory: true, confidence: true, taxCategory: true,
    },
  });

  // Build CSV (RFC 4180 quoting)
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ["Date", "Description", "Amount", "Type", "Category", "Subcategory", "Tax Category", "AI Confidence"].join(",");
  const rows = transactions.map((t) => [
    esc(t.date.toISOString().slice(0, 10)),
    esc(t.description),
    esc(t.amount.toFixed(2)),
    esc(t.type),
    esc(t.category),
    esc(t.subcategory),
    esc(t.taxCategory),
    esc(t.confidence !== null ? (t.confidence * 100).toFixed(0) + "%" : ""),
  ].join(","));

  const csv = [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledgr-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
