import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // Fetch all active (non-disposed) assets with their existing depreciation entries
  const assets = await prisma.fixedAsset.findMany({
    where: { userId, disposalDate: null },
    include: {
      depreciationEntries: { orderBy: [{ year: "asc" }, { month: "asc" }] },
    },
  });

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let assetsProcessed = 0;
  let totalEntriesCreated = 0;
  let totalDepreciationBooked = 0;

  for (const asset of assets) {
    // Straight-line monthly depreciation amount
    const monthlyDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths;

    // Determine start month
    const lastEntry =
      asset.depreciationEntries.length > 0
        ? asset.depreciationEntries[asset.depreciationEntries.length - 1]
        : null;

    let startYear: number;
    let startMonth: number;

    if (lastEntry) {
      if (lastEntry.month === 12) {
        startYear = lastEntry.year + 1;
        startMonth = 1;
      } else {
        startYear = lastEntry.year;
        startMonth = lastEntry.month + 1;
      }
    } else {
      startYear = asset.purchaseDate.getFullYear();
      startMonth = asset.purchaseDate.getMonth() + 1;
    }

    // Build periods list up to current month
    const periods: Array<{ year: number; month: number }> = [];
    let cy = startYear;
    let cm = startMonth;
    while (cy < endYear || (cy === endYear && cm <= endMonth)) {
      periods.push({ year: cy, month: cm });
      if (cm === 12) {
        cy += 1;
        cm = 1;
      } else {
        cm += 1;
      }
    }

    if (periods.length === 0) continue;

    // Running book value
    const totalDepreciated = asset.depreciationEntries.reduce((sum, e) => sum + e.amount, 0);
    let currentBookValue = asset.purchaseCost - totalDepreciated;

    // Build existing entry set for fast lookup
    const existingKeys = new Set(
      asset.depreciationEntries.map((e) => `${e.year}-${e.month}`)
    );

    let assetEntriesCreated = 0;

    for (const period of periods) {
      if (currentBookValue <= asset.salvageValue) break;
      if (existingKeys.has(`${period.year}-${period.month}`)) continue;

      let amount = monthlyDepreciation;
      if (currentBookValue - amount < asset.salvageValue) {
        amount = currentBookValue - asset.salvageValue;
      }

      const newBookValue = currentBookValue - amount;

      try {
        await prisma.depreciationEntry.create({
          data: {
            assetId: asset.id,
            userId,
            month: period.month,
            year: period.year,
            amount,
            bookValue: newBookValue,
            posted: true,
          },
        });

        existingKeys.add(`${period.year}-${period.month}`);
        currentBookValue = newBookValue;
        assetEntriesCreated += 1;
        totalDepreciationBooked += amount;

        // Auto-post GL entry (non-fatal)
        try {
          const expenseCode = asset.expenseAccountCode ?? "6000";
          const accumCode = asset.depnAccountCode ?? "1600";

          const [expenseAccount, accumAccount] = await Promise.all([
            prisma.chartOfAccount.findFirst({ where: { userId, code: expenseCode } }),
            prisma.chartOfAccount.findFirst({ where: { userId, code: accumCode } }),
          ]);

          if (expenseAccount && accumAccount) {
            const entryNumber = `DEP-${period.year}-${String(period.month).padStart(2, "0")}-${asset.id.slice(-4)}`;
            await prisma.journalEntry.create({
              data: {
                userId,
                entryNumber,
                date: new Date(period.year, period.month - 1, 1),
                description: `Depreciation - ${asset.name} ${period.month}/${period.year}`,
                type: "DEPRECIATION",
                status: "POSTED",
                lines: {
                  create: [
                    {
                      accountId: expenseAccount.id,
                      description: "Depreciation expense",
                      debit: amount,
                      credit: 0,
                    },
                    {
                      accountId: accumAccount.id,
                      description: "Accumulated depreciation",
                      debit: 0,
                      credit: amount,
                    },
                  ],
                },
              },
            });
          }
        } catch {
          console.error(`GL post failed for ${asset.id} ${period.year}-${period.month}`);
        }
      } catch {
        // Unique constraint: already booked, skip
        console.warn(`Entry exists for ${asset.id} ${period.year}-${period.month}, skipping`);
      }
    }

    if (assetEntriesCreated > 0) {
      totalEntriesCreated += assetEntriesCreated;
      assetsProcessed += 1;

      // Mark fully depreciated if book value reached salvage
      if (currentBookValue <= asset.salvageValue) {
        await prisma.fixedAsset.update({
          where: { id: asset.id },
          data: { status: "FULLY_DEPRECIATED" },
        });
      }
    }
  }

  return NextResponse.json(
    {
      assetsProcessed,
      totalEntriesCreated,
      totalDepreciationBooked: Math.round(totalDepreciationBooked * 100) / 100,
    },
    { status: 201 }
  );
}
