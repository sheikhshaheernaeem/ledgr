import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

async function buildContext(userId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [
    user,
    transactions,
    prevTransactions,
    invoices,
    bills,
    bankAccounts,
    report,
    timeEntries,
    budgets,
    fixedAssets,
    clients,
    payrollRuns,
    taxEvents,
    anomalyFlags,
    inventoryItems,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, companyName: true, country: true, currency: true, locale: true, timezone: true, taxName: true, defaultTaxRate: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart } },
      orderBy: { date: "desc" },
      select: { date: true, description: true, amount: true, type: true, category: true, status: true, voucherType: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { amount: true, type: true, category: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: { status: true, total: true, dueDate: true, clientName: true, issueDate: true, amountPaid: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.bill.findMany({
      where: { userId },
      select: { status: true, total: true, dueDate: true, vendorName: true, amountPaid: true },
      orderBy: { dueDate: "asc" },
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
      select: { hours: true, amount: true, invoiced: true, billable: true },
    }),
    prisma.budget.findMany({
      where: { userId, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { category: true, amount: true },
    }),
    prisma.fixedAsset.findMany({
      where: { userId, status: "ACTIVE" },
      select: { name: true, purchaseCost: true, salvageValue: true, depreciationMethod: true, purchaseDate: true },
    }),
    prisma.client.findMany({
      where: { userId },
      select: { name: true, company: true },
      take: 20,
    }),
    prisma.payrollRun.findMany({
      where: { userId },
      orderBy: { payDate: "desc" },
      take: 3,
      select: { runNumber: true, payDate: true, totalGross: true, totalTax: true, totalNet: true, status: true },
    }),
    prisma.taxCalendarEvent.findMany({
      where: { userId, dueDate: { gte: now }, status: { in: ["UPCOMING", "DUE_SOON"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { title: true, dueDate: true, type: true, amount: true },
    }),
    prisma.anomalyFlag.findMany({
      where: { userId, dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { entityType: true, reason: true, severity: true, riskScore: true },
    }),
    prisma.inventoryItem.findMany({
      where: { userId, isActive: true },
      select: { name: true, quantityOnHand: true, reorderPoint: true, costPrice: true },
      take: 20,
    }),
  ]);

  const currency = user?.currency ?? "USD";
  const locale = user?.locale ?? "en-US";
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // Current month stats
  const income = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  // Prev month stats
  const prevIncome = prevTransactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const openInvoices = invoices.filter(i => ["DRAFT", "SENT", "OVERDUE", "PARTIAL"].includes(i.status));
  const outstandingAR = openInvoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const overdueInvoices = invoices.filter(i => i.status === "OVERDUE");
  const openBills = bills.filter(b => ["DRAFT", "RECEIVED", "OVERDUE", "PARTIAL"].includes(b.status));
  const outstandingAP = openBills.reduce((s, b) => s + (b.total - b.amountPaid), 0);
  const overdueBills = bills.filter(b => b.status === "OVERDUE");
  const monthHours = timeEntries.reduce((s, t) => s + t.hours, 0);
  const uninvoicedHours = timeEntries.filter(t => !t.invoiced && t.billable).reduce((s, t) => s + t.hours, 0);
  const uninvoicedRevenue = timeEntries.filter(t => !t.invoiced && t.billable).reduce((s, t) => s + t.amount, 0);

  const topCategories = Object.entries(
    transactions
      .filter(t => t.type === "EXPENSE" && t.category)
      .reduce<Record<string, number>>((acc, t) => { acc[t.category!] = (acc[t.category!] || 0) + t.amount; return acc; }, {})
  ).sort(([, a], [, b]) => b - a).slice(0, 6);

  // Budget vs actual
  const budgetActual = budgets.map(b => {
    const actual = transactions.filter(t => t.type === "EXPENSE" && t.category === b.category).reduce((s, t) => s + t.amount, 0);
    const pct = b.amount > 0 ? (actual / b.amount * 100).toFixed(0) : "N/A";
    const status = actual > b.amount ? "OVER" : actual > b.amount * 0.9 ? "NEAR" : "OK";
    return { category: b.category, budget: b.amount, actual, pct, status };
  });

  // Low inventory
  const lowStock = inventoryItems.filter(i => i.reorderPoint != null && i.quantityOnHand <= i.reorderPoint!);

  const lines: string[] = [
    `## ${user?.companyName ?? user?.name ?? "Your"} Financial Dashboard`,
    `Date: ${now.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
    `Currency: ${currency} | Country: ${user?.country ?? "US"} | Tax: ${user?.taxName ?? "Tax"} @ ${user?.defaultTaxRate ?? 0}%`,
    "",
    "### 💰 Cash Position",
    bankAccounts.length === 0 ? "No bank accounts yet."
      : bankAccounts.map(a => `- ${a.name} (${a.accountType}): ${fmt(a.currentBalance)}`).join("\n"),
    `Total Cash: ${fmt(totalBankBalance)}`,
    "",
    "### 📊 This Month vs Last Month",
    `- Revenue: ${fmt(income)} (prev: ${fmt(prevIncome)}, ${prevIncome > 0 ? ((income - prevIncome) / prevIncome * 100).toFixed(1) + "%" : "N/A"} change)`,
    `- Expenses: ${fmt(expenses)} (prev: ${fmt(prevExpenses)})`,
    `- Net: ${fmt(income - expenses)}`,
    "",
    "### 📋 Top Expense Categories (This Month)",
    topCategories.length === 0 ? "No expenses yet."
      : topCategories.map(([cat, amt]) => `- ${cat}: ${fmt(amt)}`).join("\n"),
    "",
    ...(budgetActual.length > 0 ? [
      "### 🎯 Budget vs Actual (This Month)",
      ...budgetActual.map(b => `- ${b.category}: ${fmt(b.actual)} of ${fmt(b.budget)} (${b.pct}%) [${b.status}]`),
      "",
    ] : []),
    "### 📄 Accounts Receivable",
    `- Open Invoices: ${openInvoices.length} totaling ${fmt(outstandingAR)}`,
    overdueInvoices.length > 0
      ? `- OVERDUE (${overdueInvoices.length}): ${overdueInvoices.slice(0, 3).map(i => `${i.clientName} ${fmt(i.total)}`).join(", ")}`
      : "- No overdue invoices ✓",
    "",
    "### 🧾 Accounts Payable",
    `- Open Bills: ${openBills.length} totaling ${fmt(outstandingAP)}`,
    overdueBills.length > 0
      ? `- OVERDUE (${overdueBills.length}): ${overdueBills.slice(0, 3).map(b => `${b.vendorName} ${fmt(b.total)}`).join(", ")}`
      : "- No overdue bills ✓",
    "",
    "### ⏱ Time Tracking (This Month)",
    `- Hours logged: ${monthHours.toFixed(1)}h`,
    uninvoicedHours > 0 ? `- Unbilled: ${uninvoicedHours.toFixed(1)}h = ${fmt(uninvoicedRevenue)} waiting to be invoiced` : "- All hours invoiced ✓",
    "",
    "### 👥 Clients & Team",
    `- Active clients: ${clients.length}`,
    clients.length > 0 ? `- ${clients.slice(0, 5).map(c => c.company || c.name).join(", ")}` : "",
    "",
    ...(payrollRuns.length > 0 ? [
      "### 👔 Recent Payroll",
      ...payrollRuns.map(p => `- ${p.runNumber} (${new Date(p.payDate).toLocaleDateString(locale)}): Gross ${fmt(p.totalGross)}, Net ${fmt(p.totalNet)} [${p.status}]`),
      "",
    ] : []),
    ...(fixedAssets.length > 0 ? [
      "### 🏭 Fixed Assets",
      `- ${fixedAssets.length} active assets. Total cost: ${fmt(fixedAssets.reduce((s, a) => s + a.purchaseCost, 0))}`,
      ...fixedAssets.slice(0, 3).map(a => `  - ${a.name}: ${fmt(a.purchaseCost)} (${a.depreciationMethod})`),
      "",
    ] : []),
    ...(taxEvents.length > 0 ? [
      "### 📅 Upcoming Tax Deadlines",
      ...taxEvents.map(e => `- ${e.title}: due ${new Date(e.dueDate).toLocaleDateString(locale)}${e.amount ? " — " + fmt(e.amount) : ""}`),
      "",
    ] : []),
    ...(anomalyFlags.length > 0 ? [
      "### 🚨 AI Anomaly Alerts (Unresolved)",
      ...anomalyFlags.map(f => `- [${f.severity}] ${f.reason} (Risk: ${f.riskScore.toFixed(0)}/100)`),
      "",
    ] : []),
    ...(lowStock.length > 0 ? [
      "### 📦 Low Inventory Alerts",
      ...lowStock.map(i => `- ${i.name}: ${i.quantityOnHand} on hand (reorder at ${i.reorderPoint})`),
      "",
    ] : []),
    "### 📈 Last Report",
    report
      ? `${new Date(report.year, report.month - 1).toLocaleString(locale, { month: "long", year: "numeric" })}: Revenue ${fmt(report.totalIncome)}, Expenses ${fmt(report.totalExpenses)}, Net Profit ${fmt(report.netProfit)}`
      : "No monthly report generated yet. Go to Reports to generate one.",
  ];

  return lines.filter(l => l !== undefined).join("\n");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI assistant not configured. Set GROQ_API_KEY." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();
  const userId = (session.user as { id: string }).id;
  const context = await buildContext(userId);

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: `You are Ledgr AI — the built-in financial intelligence of Ledgr, an AI-native bookkeeping platform.

Your capabilities:
- Real-time financial analysis using the user's live data below
- Accounting guidance (double-entry, journal entries, reconciliation, accruals, deferrals)
- Tax optimization and deduction identification
- Cash flow analysis and forecasting
- Anomaly explanation and fraud detection
- Invoice, bill, and payroll management advice
- Budget variance analysis
- Inventory and fixed asset guidance

Communication style:
- Be direct, specific, and actionable
- Always reference the user's actual numbers — never generic advice
- Format currency amounts consistently with the user's locale
- When suggesting actions, name the exact Ledgr page (e.g. "Go to Journal Entries → New Entry")
- If you spot something concerning (overdue invoices, budget overruns, anomalies), proactively mention it
- Keep responses concise but complete — no filler, no repetition

${context}`,
    messages,
    maxTokens: 1500,
  });

  return result.toDataStreamResponse();
}
