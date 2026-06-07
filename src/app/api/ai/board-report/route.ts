import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { periodMonth, periodYear } = body;

  const year = periodYear || new Date().getFullYear();
  const month = periodMonth || new Date().getMonth() + 1;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const prevStartDate = new Date(year, month - 2, 1);
  const prevEndDate = new Date(year, month - 1, 0);

  // Gather key metrics
  const [transactions, invoices, bills, user] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: startDate, lte: endDate } },
    }),
    prisma.invoice.findMany({
      where: { userId: session.user.id, issueDate: { gte: startDate, lte: endDate } },
    }),
    prisma.bill.findMany({
      where: { userId: session.user.id, issueDate: { gte: startDate, lte: endDate } },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { companyName: true } }),
  ]);

  const prevTransactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { gte: prevStartDate, lte: prevEndDate } },
  });

  const revenue = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netIncome = revenue - expenses;
  const invoiceRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalPayables = bills.reduce((s, b) => s + (b.total - b.amountPaid), 0);

  const prevRevenue = prevTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
  const expenseGrowth = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null;

  const metrics = {
    period: `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`,
    company: user?.companyName || "Company",
    revenue, expenses, netIncome, invoiceRevenue, totalPayables,
    revenueGrowth, expenseGrowth,
    invoiceCount: invoices.length,
    billCount: bills.length,
  };

  // Generate AI narrative (streaming-like response)
  let narrative = "";

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Write a professional board report narrative for ${metrics.company} for ${metrics.period}.

Financial metrics:
- Revenue: $${revenue.toLocaleString()}
- Expenses: $${expenses.toLocaleString()}
- Net Income: $${netIncome.toLocaleString()}
- Revenue Growth vs Prior Month: ${revenueGrowth !== null ? revenueGrowth.toFixed(1) + "%" : "N/A"}
- Invoices Issued: ${invoices.length} ($${invoiceRevenue.toLocaleString()})
- Outstanding Payables: $${totalPayables.toLocaleString()}

Write a 3-4 paragraph executive summary covering: financial performance, key highlights, risks and opportunities, and outlook. Use professional board-ready language.`;

    const result = await model.generateContent(prompt);
    narrative = result.response.text();
  } catch {
    narrative = `**Financial Performance — ${metrics.period}**

${metrics.company} reported revenue of $${revenue.toLocaleString()} for ${metrics.period}${revenueGrowth !== null ? `, representing a ${revenueGrowth > 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% change versus the prior month` : ""}. Total operating expenses were $${expenses.toLocaleString()}, resulting in net income of $${netIncome > 0 ? "+" : ""}$${netIncome.toLocaleString()}.

**Key Highlights**

The company issued ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} totaling $${invoiceRevenue.toLocaleString()} during the period. Outstanding accounts payable stands at $${totalPayables.toLocaleString()}, which management is monitoring closely.

**Outlook**

Management remains focused on revenue growth and operational efficiency. Key priorities for the coming period include accounts receivable collection and cost optimization initiatives.`;
  }

  return NextResponse.json({ metrics, narrative });
}
