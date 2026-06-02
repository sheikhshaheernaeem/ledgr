import { GoogleGenerativeAI } from "@google/generative-ai";

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
}

export interface CategorizedTransaction extends RawTransaction {
  category: string;
  subcategory: string;
  confidence: number;
  aiNotes?: string;
}

export interface PLSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topExpenseCategories: { category: string; amount: number }[];
  narrative: string;
}

const CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  stripe: { category: "Revenue", subcategory: "Stripe payments" },
  paypal: { category: "Revenue", subcategory: "PayPal payments" },
  shopify: { category: "Revenue", subcategory: "Shopify sales" },
  salary: { category: "Payroll & Benefits", subcategory: "Salary" },
  payroll: { category: "Payroll & Benefits", subcategory: "Payroll" },
  aws: { category: "Software & Subscriptions", subcategory: "AWS hosting" },
  google: { category: "Software & Subscriptions", subcategory: "Google Workspace" },
  slack: { category: "Software & Subscriptions", subcategory: "Slack" },
  github: { category: "Software & Subscriptions", subcategory: "GitHub" },
  notion: { category: "Software & Subscriptions", subcategory: "Notion" },
  figma: { category: "Software & Subscriptions", subcategory: "Figma" },
  facebook: { category: "Marketing & Advertising", subcategory: "Facebook Ads" },
  meta: { category: "Marketing & Advertising", subcategory: "Meta Ads" },
  google_ads: { category: "Marketing & Advertising", subcategory: "Google Ads" },
  rent: { category: "Rent & Utilities", subcategory: "Office rent" },
  electric: { category: "Rent & Utilities", subcategory: "Electricity" },
  internet: { category: "Rent & Utilities", subcategory: "Internet" },
  uber: { category: "Travel & Entertainment", subcategory: "Rideshare" },
  airline: { category: "Travel & Entertainment", subcategory: "Flights" },
  hotel: { category: "Travel & Entertainment", subcategory: "Accommodation" },
  restaurant: { category: "Travel & Entertainment", subcategory: "Meals" },
  bank: { category: "Banking & Fees", subcategory: "Bank fees" },
  fee: { category: "Banking & Fees", subcategory: "Transaction fee" },
  insurance: { category: "Insurance", subcategory: "Business insurance" },
  tax: { category: "Taxes", subcategory: "Tax payment" },
  office: { category: "Office Supplies", subcategory: "Office supplies" },
  legal: { category: "Professional Services", subcategory: "Legal fees" },
  accountant: { category: "Professional Services", subcategory: "Accounting" },
  consultant: { category: "Professional Services", subcategory: "Consulting" },
};

function mockCategorize(tx: RawTransaction): CategorizedTransaction {
  const desc = tx.description.toLowerCase();

  if (tx.type === "CREDIT") {
    return {
      ...tx,
      category: "Revenue",
      subcategory: "Sales",
      confidence: 0.92,
    };
  }

  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (desc.includes(keyword)) {
      return { ...tx, ...cat, confidence: 0.91 + Math.random() * 0.08 };
    }
  }

  return {
    ...tx,
    category: "Other Expense",
    subcategory: "Miscellaneous",
    confidence: 0.62 + Math.random() * 0.15,
  };
}

async function realCategorize(
  transactions: RawTransaction[]
): Promise<CategorizedTransaction[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const CATEGORIES = [
    "Revenue", "Cost of Goods Sold", "Payroll & Benefits", "Rent & Utilities",
    "Software & Subscriptions", "Marketing & Advertising", "Professional Services",
    "Office Supplies", "Travel & Entertainment", "Banking & Fees", "Taxes",
    "Insurance", "Other Expense", "Other Income",
  ];

  const prompt = `You are a professional bookkeeper. Categorize these bank transactions for a small business.
Available categories: ${CATEGORIES.join(", ")}
For each transaction return a JSON array with: date, description, amount, type, category, subcategory, confidence (0-1), aiNotes.
Transactions: ${JSON.stringify(transactions, null, 2)}
Respond ONLY with valid JSON array, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const json = text.startsWith("```")
    ? text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    : text;
  return JSON.parse(json) as CategorizedTransaction[];
}

export async function categorizeTransactions(
  transactions: RawTransaction[]
): Promise<CategorizedTransaction[]> {
  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === "demo-mode"
  ) {
    return transactions.map(mockCategorize);
  }
  return realCategorize(transactions);
}

export async function generatePLSummary(
  transactions: CategorizedTransaction[],
  month: number,
  year: number
): Promise<PLSummary> {
  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  const income = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);

  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "DEBIT")
    .forEach((t) => {
      expenseByCategory[t.category] =
        (expenseByCategory[t.category] || 0) + t.amount;
    });

  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  const netProfit = income - expenses;

  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === "demo-mode"
  ) {
    const trend = netProfit >= 0 ? "profitable" : "running at a loss";
    const topCat = topExpenseCategories[0];
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit,
      topExpenseCategories,
      narrative: `${monthName} ${year} was ${trend} with $${Math.abs(netProfit).toFixed(0)} net ${netProfit >= 0 ? "profit" : "loss"}. ${topCat ? `Your largest expense category was ${topCat.category} at $${topCat.amount.toFixed(0)}.` : ""} ${netProfit >= 0 ? "Strong performance — consider reinvesting surplus into growth." : "Review discretionary spending to improve margins."}`,
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(
    `Write a 2-3 sentence CFO summary for a small business. Month: ${monthName} ${year}. Income: $${income.toFixed(2)}, Expenses: $${expenses.toFixed(2)}, Net: $${netProfit.toFixed(2)}. Top expenses: ${topExpenseCategories.map((c) => `${c.category}: $${c.amount.toFixed(0)}`).join(", ")}. Be direct, friendly, under 80 words. Plain text only.`
  );

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netProfit,
    topExpenseCategories,
    narrative: result.response.text().trim(),
  };
}
