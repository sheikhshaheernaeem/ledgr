import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiText, aiTextEnabled } from "@/lib/ai/text";

interface ForecastMonth {
  month: number;
  year: number;
  predictedIncome: number;
  predictedExpenses: number;
  predictedNet: number;
  confidence: number;
  notes: string;
}

interface ForecastResult {
  months: ForecastMonth[];
  narrative: string;
}

function generateMockForecast(
  transactions: Array<{ amount: number; type: string; date: Date }>
): ForecastResult {
  const incomeTransactions = transactions.filter((t) => t.type === "CREDIT");
  const expenseTransactions = transactions.filter((t) => t.type === "DEBIT");

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Average monthly over ~3 months
  const avgMonthlyIncome = totalIncome / 3;
  const avgMonthlyExpenses = totalExpenses / 3;

  const now = new Date();
  const months: ForecastMonth[] = [];

  for (let i = 1; i <= 2; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const variance = 0.05;
    const incomeFactor = 1 + (Math.random() * variance * 2 - variance);
    const expenseFactor = 1 + (Math.random() * variance * 2 - variance);

    const predictedIncome = parseFloat((avgMonthlyIncome * incomeFactor).toFixed(2));
    const predictedExpenses = parseFloat(
      (avgMonthlyExpenses * expenseFactor).toFixed(2)
    );
    const predictedNet = parseFloat((predictedIncome - predictedExpenses).toFixed(2));

    months.push({
      month: forecastDate.getMonth() + 1,
      year: forecastDate.getFullYear(),
      predictedIncome,
      predictedExpenses,
      predictedNet,
      confidence: 0.75,
      notes: `Based on 90-day average. ${predictedNet >= 0 ? "Positive" : "Negative"} cash flow projected.`,
    });
  }

  const overallNet = months.reduce((sum, m) => sum + m.predictedNet, 0);
  return {
    months,
    narrative: `Based on the last 90 days of activity, average monthly income is $${avgMonthlyIncome.toFixed(0)} and expenses are $${avgMonthlyExpenses.toFixed(0)}. ${overallNet >= 0 ? "Cash flow looks healthy over the next 2 months." : "Consider reviewing expenses to improve cash flow."}`,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forecast = await prisma.cashFlowForecast.findFirst({
    where: { userId: session.user.id },
    orderBy: { generatedAt: "desc" },
  });

  if (!forecast) {
    return NextResponse.json({ forecast: null });
  }

  return NextResponse.json({
    forecast: {
      ...forecast,
      forecastData: JSON.parse(forecast.forecastJson),
    },
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      date: { gte: ninetyDaysAgo },
    },
    select: {
      date: true,
      description: true,
      amount: true,
      type: true,
      category: true,
    },
    orderBy: { date: "asc" },
  });

  let forecastResult: ForecastResult;

  if (!aiTextEnabled()) {
    forecastResult = generateMockForecast(transactions);
  } else {
    try {
      const txSummary = transactions.map((t) => ({
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
      }));

      const prompt = `You are a CFO. Given these transactions from the last 90 days, predict cash flow for the next 2 months. Return JSON: { months: [{month, year, predictedIncome, predictedExpenses, predictedNet, confidence, notes}], narrative: '...' }. Transactions: ${JSON.stringify(txSummary)}. Respond ONLY with valid JSON, no markdown.`;

      const text = await aiText(prompt, { temperature: 0.3, maxTokens: 2000 });
      const json = text.startsWith("```")
        ? text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
        : text;
      forecastResult = JSON.parse(json) as ForecastResult;
    } catch (err) {
      console.error("[forecast] AI failed, using mock forecast:", err);
      forecastResult = generateMockForecast(transactions);
    }
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const saved = await prisma.cashFlowForecast.create({
    data: {
      userId: session.user.id,
      generatedAt: now,
      periodStart,
      periodEnd,
      forecastJson: JSON.stringify(forecastResult.months),
      narrative: forecastResult.narrative,
    },
  });

  return NextResponse.json({
    forecast: {
      ...saved,
      forecastData: forecastResult.months,
    },
  });
}
