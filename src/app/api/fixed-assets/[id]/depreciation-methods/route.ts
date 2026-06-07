import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({ where: { id, userId: session.user.id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cost = asset.purchaseCost;
  const salvage = asset.salvageValue;
  const life = asset.usefulLifeMonths;
  const depreciable = cost - salvage;

  // Straight-Line
  const straightLine = Array.from({ length: life }, (_, i) => ({
    period: i + 1,
    depreciation: depreciable / life,
    bookValue: cost - (depreciable / life) * (i + 1),
  }));

  // Double Declining Balance
  const ddbRate = 2 / life;
  let ddbBookValue = cost;
  const doubleDeclining = Array.from({ length: life }, (_, i) => {
    const dep = Math.min(ddbBookValue * ddbRate, ddbBookValue - salvage);
    ddbBookValue -= dep;
    return { period: i + 1, depreciation: dep, bookValue: ddbBookValue };
  });

  // Sum of Years Digits
  const sumOfYears = (life * (life + 1)) / 2;
  let sydBookValue = cost;
  const sydDepreciation = Array.from({ length: life }, (_, i) => {
    const fraction = (life - i) / sumOfYears;
    const dep = depreciable * fraction;
    sydBookValue -= dep;
    return { period: i + 1, depreciation: dep, bookValue: sydBookValue };
  });

  // Annual summaries for comparison
  const annualStraightLine = [];
  const annualDDB = [];
  const annualSYD = [];

  for (let y = 0; y < Math.ceil(life / 12); y++) {
    const yearMonths = straightLine.slice(y * 12, (y + 1) * 12);
    annualStraightLine.push({
      year: y + 1,
      depreciation: yearMonths.reduce((s, m) => s + m.depreciation, 0),
      bookValue: yearMonths[yearMonths.length - 1]?.bookValue ?? 0,
    });

    const yearMonthsDDB = doubleDeclining.slice(y * 12, (y + 1) * 12);
    annualDDB.push({
      year: y + 1,
      depreciation: yearMonthsDDB.reduce((s, m) => s + m.depreciation, 0),
      bookValue: yearMonthsDDB[yearMonthsDDB.length - 1]?.bookValue ?? 0,
    });

    const yearMonthsSYD = sydDepreciation.slice(y * 12, (y + 1) * 12);
    annualSYD.push({
      year: y + 1,
      depreciation: yearMonthsSYD.reduce((s, m) => s + m.depreciation, 0),
      bookValue: yearMonthsSYD[yearMonthsSYD.length - 1]?.bookValue ?? 0,
    });
  }

  return NextResponse.json({
    asset: { id: asset.id, name: asset.name, cost, salvage, life, depreciable },
    methods: {
      STRAIGHT_LINE: { annual: annualStraightLine, monthly: straightLine },
      DOUBLE_DECLINING: { annual: annualDDB, monthly: doubleDeclining },
      SUM_OF_YEARS_DIGITS: { annual: annualSYD, monthly: sydDepreciation },
    },
  });
}
