import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, assumptions } = body;

  // Get baseline: last 6 months of transactions
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { gte: sixMonthsAgo } },
    orderBy: { date: "asc" },
  });

  const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0 };
    if (tx.amount > 0) monthlyData[key].revenue += tx.amount;
    else monthlyData[key].expenses += Math.abs(tx.amount);
  }

  let forecastJson: Array<{ month: string; revenue: number; expenses: number; cashFlow: number }> = [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a financial modeling expert. Generate a 12-month cash flow forecast based on:

Historical monthly data:
${JSON.stringify(monthlyData, null, 2)}

Scenario assumptions:
${JSON.stringify(assumptions, null, 2)}

Return ONLY a JSON array of 12 months starting from next month:
[{"month": "YYYY-MM", "revenue": number, "expenses": number, "cashFlow": number}]

Apply the assumptions to adjust revenue growth, expense changes, and new costs.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      forecastJson = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback: generate simple projection
    const months = Object.values(monthlyData);
    const avgRevenue = months.length ? months.reduce((s, m) => s + m.revenue, 0) / months.length : 10000;
    const avgExpenses = months.length ? months.reduce((s, m) => s + m.expenses, 0) / months.length : 8000;

    const revenueGrowth = assumptions?.revenueGrowth ? parseFloat(assumptions.revenueGrowth) / 100 : 0.05;
    const expenseGrowth = assumptions?.expenseGrowth ? parseFloat(assumptions.expenseGrowth) / 100 : 0.03;
    const additionalMonthly = assumptions?.additionalMonthlyExpense ? parseFloat(assumptions.additionalMonthlyExpense) : 0;

    const now = new Date();
    forecastJson = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const revenue = avgRevenue * Math.pow(1 + revenueGrowth, i + 1);
      const expenses = (avgExpenses + additionalMonthly) * Math.pow(1 + expenseGrowth, i + 1);
      return { month, revenue, expenses, cashFlow: revenue - expenses };
    });
  }

  const scenario = await prisma.cashFlowScenario.create({
    data: {
      userId: session.user.id,
      name: name || "New Scenario",
      description: description || null,
      assumptions: JSON.stringify(assumptions || {}),
      forecastJson: JSON.stringify(forecastJson),
    },
  });

  return NextResponse.json({ ...scenario, forecast: forecastJson }, { status: 201 });
}
