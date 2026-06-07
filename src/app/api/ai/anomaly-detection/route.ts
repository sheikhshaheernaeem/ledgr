import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch last 90 days of transactions
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: ninetyDaysAgo },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  if (transactions.length === 0) {
    return NextResponse.json({ flagged: 0, flags: [] });
  }

  let aiFlags: Array<{ transactionId?: string; entityType: string; entityId: string; reason: string; severity: string; riskScore: number }> = [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const txSummary = transactions.slice(0, 50).map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
    }));

    const prompt = `Analyze these financial transactions for anomalies. Return ONLY valid JSON array.

Transactions:
${JSON.stringify(txSummary, null, 2)}

Return JSON array of anomalies found:
[{"transactionId": "id", "reason": "reason", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "riskScore": 0.0-1.0}]

Look for: duplicate amounts, unusually large/small amounts, round numbers over $10000, weekend entries for large amounts, unusual vendors/descriptions.
Return empty array [] if no anomalies found.`;

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
        severity: f.severity || "MEDIUM",
        riskScore: f.riskScore || 0.5,
      }));
    }
  } catch {
    // Fallback: rule-based detection
    const amounts = transactions.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.map(a => Math.pow(a - avgAmount, 2)).reduce((s, a) => s + a, 0) / amounts.length);

    for (const tx of transactions) {
      const absAmount = Math.abs(tx.amount);
      if (absAmount > avgAmount + 3 * stdDev && absAmount > 1000) {
        aiFlags.push({
          transactionId: tx.id,
          entityType: "TRANSACTION",
          entityId: tx.id,
          reason: `Unusually large amount: $${absAmount.toFixed(2)} (${((absAmount - avgAmount) / stdDev).toFixed(1)} std devs above average)`,
          severity: absAmount > 10000 ? "HIGH" : "MEDIUM",
          riskScore: Math.min(0.95, (absAmount - avgAmount) / (stdDev * 5)),
        });
      }

      // Check for round numbers over 10k
      if (absAmount >= 10000 && absAmount % 1000 === 0) {
        aiFlags.push({
          transactionId: tx.id,
          entityType: "TRANSACTION",
          entityId: tx.id,
          reason: `Large round-number transaction: $${absAmount.toFixed(2)}`,
          severity: "LOW",
          riskScore: 0.3,
        });
      }
    }
  }

  // Save flags (avoid duplicates)
  const savedFlags = [];
  for (const flag of aiFlags) {
    const exists = await prisma.anomalyFlag.findFirst({
      where: { userId: session.user.id, entityId: flag.entityId, dismissed: false },
    });
    if (!exists) {
      const saved = await prisma.anomalyFlag.create({
        data: {
          userId: session.user.id,
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

  return NextResponse.json({ flagged: savedFlags.length, flags: savedFlags });
}
