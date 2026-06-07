import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      costs: true,
      client: { select: { name: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalCosts = project.costs.reduce((sum, c) => sum + c.amount, 0);
  const billableCosts = project.costs.filter(c => c.billable).reduce((sum, c) => sum + c.amount, 0);
  const unbillableCosts = totalCosts - billableCosts;

  const budget = project.budget || 0;
  const budgetUtilization = budget > 0 ? (totalCosts / budget) * 100 : 0;
  const grossProfit = budget - totalCosts;
  const grossMargin = budget > 0 ? (grossProfit / budget) * 100 : 0;

  const costsByCategory: Record<string, number> = {};
  for (const cost of project.costs) {
    costsByCategory[cost.category] = (costsByCategory[cost.category] || 0) + cost.amount;
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      budget,
      billingType: project.billingType,
      client: project.client?.name,
    },
    profitability: {
      totalCosts,
      billableCosts,
      unbillableCosts,
      budget,
      budgetUtilization,
      grossProfit,
      grossMargin,
      costsByCategory,
    },
  });
}
