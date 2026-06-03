import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const ALL_CATEGORIES = [
  "Revenue",
  "Cost of Goods Sold",
  "Payroll & Benefits",
  "Rent & Utilities",
  "Software & Subscriptions",
  "Marketing & Advertising",
  "Professional Services",
  "Office Supplies",
  "Travel & Entertainment",
  "Banking & Fees",
  "Taxes",
  "Insurance",
  "Other Expense",
  "Other Income",
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (!month || !year || isNaN(month) || isNaN(year)) {
    return NextResponse.json(
      { error: "month and year are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const [budgets, actuals] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: session.user.id, month, year },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId: session.user.id,
        status: "APPROVED",
        date: { gte: startDate, lte: endDate },
        category: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));
  const actualMap = new Map(
    actuals.map((a) => [a.category as string, a._sum.amount ?? 0])
  );

  // Merge all known categories
  const allCategories = new Set([
    ...ALL_CATEGORIES,
    ...budgetMap.keys(),
    ...actualMap.keys(),
  ]);

  const result = Array.from(allCategories).map((category) => {
    const budgeted = budgetMap.get(category) ?? 0;
    const actual = actualMap.get(category) ?? 0;
    return {
      category,
      budgeted,
      actual,
      variance: budgeted - actual,
    };
  });

  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { month, year, budgets } = body as {
    month: number;
    year: number;
    budgets: Array<{ category: string; amount: number }>;
  };

  if (!month || !year || !budgets || !Array.isArray(budgets)) {
    return NextResponse.json(
      { error: "month, year, and budgets array are required" },
      { status: 400 }
    );
  }

  const upserted = await Promise.all(
    budgets.map((b) =>
      prisma.budget.upsert({
        where: {
          userId_year_month_category: {
            userId: session.user!.id as string,
            year,
            month,
            category: b.category,
          },
        },
        create: {
          userId: session.user!.id as string,
          year,
          month,
          category: b.category,
          amount: b.amount,
        },
        update: {
          amount: b.amount,
        },
      })
    )
  );

  await writeAudit({
    userId: session.user.id,
    action: "UPSERT_BUDGETS",
    entityType: "Budget",
    entityId: `${year}-${month}`,
    after: { month, year, budgets },
  });

  return NextResponse.json(upserted);
}
