import { aiText, aiTextEnabled } from "@/lib/ai/text";

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

const CATEGORIES = [
  "Revenue", "Cost of Goods Sold", "Payroll & Benefits", "Rent & Utilities",
  "Software & Subscriptions", "Marketing & Advertising", "Professional Services",
  "Office Supplies", "Travel & Entertainment", "Banking & Fees", "Taxes",
  "Insurance", "Other Expense", "Other Income",
];

async function realCategorizeBatch(
  transactions: RawTransaction[]
): Promise<CategorizedTransaction[]> {
  const prompt = `You are a professional bookkeeper. Categorize these bank transactions for a small business.
Available categories: ${CATEGORIES.join(", ")}
For each transaction return a JSON array with: date, description, amount, type, category, subcategory, confidence (0-1), aiNotes.
Transactions: ${JSON.stringify(transactions)}
Respond ONLY with valid JSON array, no markdown, no explanation.`;

  const text = await aiText(prompt, { temperature: 0.2, maxTokens: 4000 });
  const json = text.startsWith("```")
    ? text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    : text;
  return JSON.parse(json) as CategorizedTransaction[];
}

async function realCategorize(
  transactions: RawTransaction[]
): Promise<CategorizedTransaction[]> {
  // Process in batches of 50 to avoid token limits
  const BATCH_SIZE = 50;
  const results: CategorizedTransaction[] = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const categorized = await realCategorizeBatch(batch);
    results.push(...categorized);
  }

  return results;
}

export async function categorizeTransactions(
  transactions: RawTransaction[]
): Promise<CategorizedTransaction[]> {
  if (!aiTextEnabled()) {
    return transactions.map(mockCategorize);
  }

  try {
    return await realCategorize(transactions);
  } catch (err) {
    // AI provider unavailable or malformed response — fall back to keyword matching
    console.error("[categorize] AI failed, using keyword fallback:", err);
    return transactions.map(mockCategorize);
  }
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

  const fallbackNarrative = () => {
    const trend = netProfit >= 0 ? "profitable" : "running at a loss";
    const topCat = topExpenseCategories[0];
    return `${monthName} ${year} was ${trend} with $${Math.abs(netProfit).toFixed(0)} net ${netProfit >= 0 ? "profit" : "loss"}. ${topCat ? `Your largest expense category was ${topCat.category} at $${topCat.amount.toFixed(0)}.` : ""} ${netProfit >= 0 ? "Strong performance — consider reinvesting surplus into growth." : "Review discretionary spending to improve margins."}`;
  };

  let narrative: string;
  if (!aiTextEnabled()) {
    narrative = fallbackNarrative();
  } else {
    try {
      narrative = await aiText(
        `Write a 2-3 sentence CFO summary for a small business. Month: ${monthName} ${year}. Income: $${income.toFixed(2)}, Expenses: $${expenses.toFixed(2)}, Net: $${netProfit.toFixed(2)}. Top expenses: ${topExpenseCategories.map((c) => `${c.category}: $${c.amount.toFixed(0)}`).join(", ")}. Be direct, friendly, under 80 words. Plain text only.`,
        { temperature: 0.4, maxTokens: 200 }
      );
    } catch (err) {
      console.error("[pl-summary] AI failed, using template:", err);
      narrative = fallbackNarrative();
    }
  }

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netProfit,
    topExpenseCategories,
    narrative,
  };
}
