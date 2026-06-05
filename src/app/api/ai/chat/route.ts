import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function buildContext(userId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [transactions, invoices, bills, bankAccounts, report, timeEntries] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 30,
        select: { date: true, description: true, amount: true, type: true, category: true },
      }),
      prisma.invoice.findMany({
        where: { userId, status: { in: ["DRAFT", "SENT", "OVERDUE"] } },
        select: { status: true, total: true, dueDate: true, clientName: true },
      }),
      prisma.bill.findMany({
        where: { userId, status: { in: ["DRAFT", "RECEIVED", "OVERDUE"] } },
        select: { status: true, total: true, dueDate: true, vendorName: true },
      }),
      prisma.bankAccount.findMany({
        where: { userId },
        select: { name: true, currentBalance: true, currency: true, accountType: true },
      }),
      prisma.report.findFirst({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { month: true, year: true, totalIncome: true, totalExpenses: true, netProfit: true },
      }),
      prisma.timeEntry.findMany({
        where: { userId, date: { gte: monthStart } },
        select: { hours: true, amount: true, invoiced: true },
      }),
    ]);

  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const outstandingInvoices = invoices.reduce((s, i) => s + i.total, 0);
  const unpaidBills = bills.reduce((s, b) => s + b.total, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const overdueBills = bills.filter((b) => b.status === "OVERDUE");
  const monthHours = timeEntries.reduce((s, t) => s + t.hours, 0);
  const uninvoicedHours = timeEntries.filter((t) => !t.invoiced).reduce((s, t) => s + t.hours, 0);

  const topCategories = Object.entries(
    transactions
      .filter((t) => t.type === "EXPENSE" && t.category)
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category!] = (acc[t.category!] || 0) + t.amount;
        return acc;
      }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines: string[] = [
    `## User's Live Financial Snapshot (as of ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})`,
    "",
    "### Bank Accounts",
    bankAccounts.length === 0
      ? "No bank accounts connected."
      : bankAccounts.map((a) => `- ${a.name} (${a.accountType}): ${fmt(a.currentBalance)} ${a.currency}`).join("\n"),
    `Total Balance: ${fmt(totalBankBalance)}`,
    "",
    "### Recent Activity (last 30 transactions)",
    `- Total Income: ${fmt(income)}`,
    `- Total Expenses: ${fmt(expenses)}`,
    `- Net: ${fmt(income - expenses)}`,
    "",
    "### Top Expense Categories",
    topCategories.length === 0
      ? "No categorized expenses."
      : topCategories.map(([cat, amt]) => `- ${cat}: ${fmt(amt)}`).join("\n"),
    "",
    "### Invoices (Open/Overdue)",
    `- Outstanding Invoices: ${invoices.length} totaling ${fmt(outstandingInvoices)}`,
    overdueInvoices.length > 0
      ? `- Overdue Invoices: ${overdueInvoices.length} — ${overdueInvoices.map((i) => `${i.clientName ?? "Unknown"} ${fmt(i.total)}`).join(", ")}`
      : `- Overdue Invoices: 0`,
    "",
    "### Bills / Accounts Payable",
    `- Unpaid Bills: ${bills.length} totaling ${fmt(unpaidBills)}`,
    overdueBills.length > 0
      ? `- Overdue Bills: ${overdueBills.length} — ${overdueBills.map((b) => `${b.vendorName ?? "Unknown"} ${fmt(b.total)}`).join(", ")}`
      : `- Overdue Bills: 0`,
    "",
    "### Time Tracking (this month)",
    `- Hours logged: ${monthHours.toFixed(1)}h`,
    `- Uninvoiced hours: ${uninvoicedHours.toFixed(1)}h`,
    "",
    "### Last Monthly Report",
    report
      ? `${new Date(report.year, report.month - 1).toLocaleString("default", { month: "long", year: "numeric" })}: Income ${fmt(report.totalIncome)}, Expenses ${fmt(report.totalExpenses)}, Net ${fmt(report.netProfit)}`
      : "No reports generated yet.",
  ];

  return lines.join("\n");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();
  const userId = (session.user as { id: string }).id;

  const context = await buildContext(userId);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: `You are Ledgr AI, a smart financial assistant built into Ledgr — an AI-native bookkeeping platform.

You help users with:
- Understanding their financial position and cash flow
- Accounting questions (journal entries, double-entry bookkeeping, reconciliation)
- Tax guidance and deduction opportunities
- Invoice and bill management
- Payroll and time tracking
- Financial analysis and forecasting
- Interpreting their reports and statements

You have access to the user's live financial data shown below. Use it to give personalized, specific answers.
Be concise, friendly, and professional. Format numbers as currency where appropriate.
When you recommend actions the user can take in Ledgr, mention the specific page (e.g. "Go to Journal Entries to record this").

${context}`,
    messages,
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
