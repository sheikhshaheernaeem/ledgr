import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/firm/bulk-categorize
 * Body: { clientId, transactionIds: string[], category: string, subcategory?: string, saveRule?: boolean, ruleKeyword?: string }
 *
 * Applies the category to all listed transactions. If saveRule=true, creates a
 * CategorizationRule so future similar descriptions auto-categorize.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const operatorId = session.user.id as string;

  const body = await req.json();
  const { clientId, transactionIds, category, subcategory, saveRule, ruleKeyword } = body as {
    clientId: string;
    transactionIds: string[];
    category: string;
    subcategory?: string;
    saveRule?: boolean;
    ruleKeyword?: string;
  };

  if (!clientId || !category || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return NextResponse.json({ error: "clientId, category, transactionIds required" }, { status: 400 });
  }

  // Authorize
  if (role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: operatorId, clientId } },
    });
    if (!mc?.isActive) return NextResponse.json({ error: "Not your client" }, { status: 403 });
  }

  // Update all listed transactions
  const updated = await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, userId: clientId },
    data: {
      category,
      subcategory: subcategory ?? null,
      status: "APPROVED",
    },
  });

  // Optionally save a rule for future
  let ruleCreated = null;
  if (saveRule && ruleKeyword?.trim()) {
    try {
      ruleCreated = await prisma.categorizationRule.create({
        data: {
          userId: clientId,
          keyword: ruleKeyword.trim().toLowerCase(),
          matchType: "CONTAINS",
          category,
          subcategory: subcategory ?? null,
          priority: 100,
        },
      });
    } catch (e) {
      console.error("[bulk-categorize] rule creation failed:", e);
    }
  }

  return NextResponse.json({
    updatedCount: updated.count,
    ruleCreated: ruleCreated ? { id: ruleCreated.id, keyword: ruleCreated.keyword } : null,
  });
}
