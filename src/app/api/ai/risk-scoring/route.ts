import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiText, aiTextEnabled } from "@/lib/ai/text";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, date: { gte: thirtyDaysAgo } },
    include: { lines: { include: { account: true } } },
    take: 50,
  });

  let riskAssessment: Array<{ entryId: string; entryNumber: string; riskLevel: string; riskScore: number; concerns: string[] }> = [];

  try {
    if (!aiTextEnabled()) throw new Error("No AI key");

    const entrySummary = journalEntries.map(e => ({
      id: e.id,
      entryNumber: e.entryNumber,
      date: e.date,
      description: e.description,
      type: e.type,
      total: e.lines.reduce((s, l) => s + l.debit, 0),
      lines: e.lines.map(l => ({ account: l.account.name, type: l.account.type, debit: l.debit, credit: l.credit })),
    }));

    const prompt = `Analyze these journal entries for audit risk. Return ONLY valid JSON array.

Journal Entries:
${JSON.stringify(entrySummary, null, 2)}

Return risk assessment:
[{"entryId": "id", "entryNumber": "JE-001", "riskLevel": "LOW|MEDIUM|HIGH", "riskScore": 0.0-1.0, "concerns": ["concern1"]}]

Check for: unusual account combinations, large round amounts, entries without clear business purpose, self-balancing unusual accounts, entries near period end.`;

    const text = await aiText(prompt, { temperature: 0.2, maxTokens: 2000 });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) riskAssessment = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback rule-based scoring
    riskAssessment = journalEntries.map(e => {
      const concerns: string[] = [];
      let riskScore = 0.1;

      const total = e.lines.reduce((s, l) => s + l.debit, 0);
      if (total > 50000) { concerns.push("Large amount journal entry"); riskScore += 0.3; }
      if (total % 1000 === 0 && total > 10000) { concerns.push("Round number entry"); riskScore += 0.1; }
      if (e.type === "MANUAL") { concerns.push("Manual journal entry"); riskScore += 0.1; }
      if (e.description.length < 10) { concerns.push("Insufficient description"); riskScore += 0.2; }

      return {
        entryId: e.id,
        entryNumber: e.entryNumber,
        riskLevel: riskScore > 0.5 ? "HIGH" : riskScore > 0.3 ? "MEDIUM" : "LOW",
        riskScore: Math.min(0.99, riskScore),
        concerns,
      };
    });
  }

  return NextResponse.json({ analyzed: journalEntries.length, riskAssessment });
}
