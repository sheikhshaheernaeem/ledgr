import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Run anomaly detection on a user's transactions.
 *
 * By default scans the current session user. Accountants/Admins can pass
 * { userId: "<client-id>" } in the body to scan a managed client's books.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUserId = session.user.id as string;
  const sessionRole = (session.user as { role?: string }).role;

  const body = await req.json().catch(() => ({}));
  const targetUserId: string = body?.userId || sessionUserId;

  // Authorization for cross-user scans
  if (targetUserId !== sessionUserId) {
    if (sessionRole !== "ACCOUNTANT" && sessionRole !== "ADMIN" && sessionRole !== "QA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (sessionRole === "ACCOUNTANT") {
      const mc = await prisma.managedClient.findUnique({
        where: { accountantId_clientId: { accountantId: sessionUserId, clientId: targetUserId } },
      });
      if (!mc?.isActive) return NextResponse.json({ error: "Not your client" }, { status: 403 });
    }
  }

  // Fetch last 90 days of transactions
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: targetUserId,
      date: { gte: ninetyDaysAgo },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  if (transactions.length === 0) {
    return NextResponse.json({ flagged: 0, flags: [], scanned: 0 });
  }

  let aiFlags: Array<{ transactionId?: string; entityType: string; entityId: string; reason: string; severity: string; riskScore: number }> = [];

  // Try Gemini first
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "demo-mode") throw new Error("No API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const txSummary = transactions.slice(0, 60).map(t => ({
      id: t.id,
      date: t.date.toISOString().split("T")[0],
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
    }));

    const prompt = `You are a forensic accountant scanning a small business's transactions for anomalies.

Return ONLY a valid JSON array (no markdown, no code fences).

Transactions:
${JSON.stringify(txSummary, null, 2)}

Look specifically for:
1. Duplicate charges (same vendor + same amount within 7 days)
2. Unusually large amounts (>3x typical for that vendor/category)
3. Round-number amounts over $10,000 (potential fraud signal)
4. Weekend or after-hours transactions for large amounts
5. New/unknown vendors with large charges
6. Repeated identical amounts from different vendors (potential card testing)

Output JSON shape:
[{"transactionId":"<id>","reason":"<one sentence why>","severity":"LOW|MEDIUM|HIGH|CRITICAL","riskScore":0.0-1.0}]

Return [] if nothing found. Be precise — false positives erode trust.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      aiFlags = parsed.map((f: { transactionId?: string; reason?: string; severity?: string; riskScore?: number }) => ({
        transactionId: f.transactionId,
        entityType: "TRANSACTION",
        entityId: f.transactionId || "unknown",
        reason: f.reason || "Anomaly detected",
        severity: (f.severity ?? "MEDIUM").toUpperCase(),
        riskScore: typeof f.riskScore === "number" ? Math.max(0, Math.min(1, f.riskScore)) : 0.5,
      }));
    }
  } catch (e) {
    console.error("[anomaly-detection] Gemini failed, falling back to rule-based:", e);
  }

  // Always run rule-based as a baseline (complements AI)
  const amounts = transactions.map(t => Math.abs(t.amount));
  const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.map(a => Math.pow(a - avgAmount, 2)).reduce((s, a) => s + a, 0) / amounts.length);

  const ruleFlags: typeof aiFlags = [];
  const seenAmountByVendor = new Map<string, { id: string; date: Date; amount: number }[]>();

  for (const tx of transactions) {
    const absAmount = Math.abs(tx.amount);
    const vendorKey = (tx.description || "").toLowerCase().slice(0, 40);

    // 1. Statistical outlier
    if (stdDev > 0 && absAmount > avgAmount + 3 * stdDev && absAmount > 500) {
      ruleFlags.push({
        transactionId: tx.id,
        entityType: "TRANSACTION",
        entityId: tx.id,
        reason: `Unusually large amount: $${absAmount.toFixed(2)} (${((absAmount - avgAmount) / stdDev).toFixed(1)}σ above average)`,
        severity: absAmount > 10000 ? "HIGH" : "MEDIUM",
        riskScore: Math.min(0.9, (absAmount - avgAmount) / (stdDev * 5)),
      });
    }

    // 2. Large round-number
    if (absAmount >= 10000 && absAmount % 1000 === 0) {
      ruleFlags.push({
        transactionId: tx.id,
        entityType: "TRANSACTION",
        entityId: tx.id,
        reason: `Large round-number transaction ($${absAmount.toFixed(0)}) — verify with supporting docs`,
        severity: "LOW",
        riskScore: 0.35,
      });
    }

    // 3. Uncategorized + over $500
    if ((!tx.category || tx.category === "Uncategorized") && absAmount > 500) {
      ruleFlags.push({
        transactionId: tx.id,
        entityType: "TRANSACTION",
        entityId: tx.id,
        reason: `Uncategorized transaction over $500: ${tx.description}`,
        severity: "LOW",
        riskScore: 0.25,
      });
    }

    // 4. Duplicate detection: same vendor + same amount within 7 days
    const prev = seenAmountByVendor.get(vendorKey) ?? [];
    const dup = prev.find((p) =>
      Math.abs(p.amount - absAmount) < 0.01 &&
      Math.abs(tx.date.getTime() - p.date.getTime()) < 7 * 24 * 60 * 60 * 1000
    );
    if (dup) {
      ruleFlags.push({
        transactionId: tx.id,
        entityType: "TRANSACTION",
        entityId: tx.id,
        reason: `Possible duplicate of txn ${dup.id} — same vendor, same amount ($${absAmount.toFixed(2)}) within 7 days`,
        severity: "HIGH",
        riskScore: 0.85,
      });
    }
    seenAmountByVendor.set(vendorKey, [...prev, { id: tx.id, date: tx.date, amount: absAmount }]);
  }

  // Merge AI + rule flags, deduplicate by entityId
  const allFlags = [...aiFlags, ...ruleFlags];
  const byEntity = new Map<string, (typeof allFlags)[number]>();
  for (const f of allFlags) {
    if (!byEntity.has(f.entityId)) byEntity.set(f.entityId, f);
  }
  const dedupedFlags = Array.from(byEntity.values());

  // Save flags (skip if already exists & not dismissed)
  const savedFlags = [];
  for (const flag of dedupedFlags) {
    const exists = await prisma.anomalyFlag.findFirst({
      where: { userId: targetUserId, entityId: flag.entityId, dismissed: false },
    });
    if (!exists) {
      const saved = await prisma.anomalyFlag.create({
        data: {
          userId: targetUserId,
          transactionId: flag.transactionId || null,
          entityType: flag.entityType,
          entityId: flag.entityId,
          reason: flag.reason,
          severity: flag.severity,
          riskScore: flag.riskScore,
        },
      });
      savedFlags.push(saved);
    }
  }

  return NextResponse.json({
    scanned: transactions.length,
    flagged: savedFlags.length,
    flags: savedFlags,
  });
}
