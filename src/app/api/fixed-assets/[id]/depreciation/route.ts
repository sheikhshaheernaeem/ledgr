import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const asset = await prisma.fixedAsset.findFirst({
    where: { id, userId },
    include: { depreciationEntries: { orderBy: [{ year: "asc" }, { month: "asc" }] } },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Straight-line monthly depreciation amount
  const monthlyDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths;

  // Determine start month: month after the last booked entry, or first month of purchase
  let startYear: number;
  let startMonth: number;

  const lastEntry =
    asset.depreciationEntries.length > 0
      ? asset.depreciationEntries[asset.depreciationEntries.length - 1]
      : null;

  if (lastEntry) {
    // Start from the month after the last booked entry
    if (lastEntry.month === 12) {
      startYear = lastEntry.year + 1;
      startMonth = 1;
    } else {
      startYear = lastEntry.year;
      startMonth = lastEntry.month + 1;
    }
  } else {
    // No entries yet: start from the month of purchase
    startYear = asset.purchaseDate.getFullYear();
    startMonth = asset.purchaseDate.getMonth() + 1;
  }

  // End at the current month (inclusive)
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  // Build the list of (year, month) periods to book
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

  if (periods.length === 0) {
    return NextResponse.json({ message: "No new periods to book", entries: [] });
  }

  // Calculate running book value starting from existing depreciation total
  const totalDepreciated = asset.depreciationEntries.reduce((sum, e) => sum + e.amount, 0);
  let currentBookValue = asset.purchaseCost - totalDepreciated;

  const newEntries = [];

  for (const period of periods) {
    // Stop if already at or below salvage value
    if (currentBookValue <= asset.salvageValue) break;

    // Clamp final period so we never go below salvage value
    let amount = monthlyDepreciation;
    if (currentBookValue - amount < asset.salvageValue) {
      amount = currentBookValue - asset.salvageValue;
    }

    const newBookValue = currentBookValue - amount;

    // Skip if this period already exists (safety guard against race conditions)
    const alreadyExists = asset.depreciationEntries.some(
      (e) => e.year === period.year && e.month === period.month
    );
    if (alreadyExists) {
      currentBookValue = newBookValue;
      continue;
    }

    try {
      const entry = await prisma.depreciationEntry.create({
        data: {
          assetId: id,
          userId,
          month: period.month,
          year: period.year,
          amount,
          bookValue: newBookValue,
          posted: true,
        },
      });

      newEntries.push(entry);
      currentBookValue = newBookValue;

      // Auto-post GL journal entry for depreciation (non-fatal)
      try {
        const expenseCode = asset.expenseAccountCode ?? "6000";
        const accumCode = asset.depnAccountCode ?? "1600";

        const [expenseAccount, accumAccount] = await Promise.all([
          prisma.chartOfAccount.findFirst({ where: { userId, code: expenseCode } }),
          prisma.chartOfAccount.findFirst({ where: { userId, code: accumCode } }),
        ]);

        if (expenseAccount && accumAccount) {
          const entryNumber = `DEP-${period.year}-${String(period.month).padStart(2, "0")}-${id.slice(-4)}`;
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
        console.error(`Failed to auto-post GL entry for depreciation: ${id} ${period.year}-${period.month}`);
      }
    } catch {
      // Unique constraint violation means it was already booked — skip
      console.warn(`Depreciation entry already exists for ${id} ${period.year}-${period.month}, skipping`);
    }
  }

  // Mark asset as fully depreciated if book value is now at salvage
  if (currentBookValue <= asset.salvageValue) {
    await prisma.fixedAsset.update({
      where: { id },
      data: { status: "FULLY_DEPRECIATED" },
    });
  }

  return NextResponse.json(
    { message: `Booked ${newEntries.length} depreciation entries`, entries: newEntries },
    { status: 201 }
  );
}
