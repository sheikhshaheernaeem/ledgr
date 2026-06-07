import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // BUG 6 FIX: Cash from bank account current balances, not transaction net flows
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    select: { currentBalance: true },
  });
  const cash = bankAccounts.reduce((sum, acct) => sum + acct.currentBalance, 0);

  // Accounts Receivable: sum of total on SENT + OVERDUE invoices
  const arInvoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["SENT", "OVERDUE"] },
    },
    select: { total: true, amountPaid: true },
  });

  const accountsReceivable = arInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  // BUG 7 FIX: Fixed assets — net book value = purchaseCost - salvageValue - accumulated depreciation
  const fixedAssets = await prisma.fixedAsset.findMany({
    where: { userId: session.user.id, disposalDate: null },
    include: { depreciationEntries: true },
  });

  let totalFixedAssetsNBV = 0;
  for (const asset of fixedAssets) {
    const depreciableBase = asset.purchaseCost - asset.salvageValue;

    // Use posted depreciation entries if available; otherwise calculate programmatically
    const postedDepreciation = asset.depreciationEntries
      .filter((e) => e.posted)
      .reduce((sum, e) => sum + e.amount, 0);

    let accumulatedDepreciation: number;
    if (postedDepreciation > 0) {
      accumulatedDepreciation = postedDepreciation;
    } else {
      // Straight-line: monthly rate × months elapsed since purchase
      const purchaseDate = new Date(asset.purchaseDate);
      const monthsElapsed =
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth());
      const monthlyDepreciation =
        asset.usefulLifeMonths > 0 ? depreciableBase / asset.usefulLifeMonths : 0;
      accumulatedDepreciation = Math.min(
        monthlyDepreciation * Math.max(0, monthsElapsed),
        depreciableBase
      );
    }

    const nbv = asset.purchaseCost - accumulatedDepreciation;
    totalFixedAssetsNBV += Math.max(0, nbv);
  }

  const totalAssets = cash + accountsReceivable + totalFixedAssetsNBV;

  // Accounts Payable: outstanding PENDING/OVERDUE bills
  const apBills = await prisma.bill.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    select: { total: true, amountPaid: true },
  });

  const accountsPayable = apBills.reduce(
    (sum, bill) => sum + (bill.total - bill.amountPaid),
    0
  );
  const totalLiabilities = accountsPayable;

  const equity = totalAssets - totalLiabilities;

  return NextResponse.json({
    asOf: now.toISOString(),
    assets: {
      cash: parseFloat(cash.toFixed(2)),
      accountsReceivable: parseFloat(accountsReceivable.toFixed(2)),
      fixedAssets: parseFloat(totalFixedAssetsNBV.toFixed(2)),
      total: parseFloat(totalAssets.toFixed(2)),
    },
    liabilities: {
      accountsPayable: parseFloat(accountsPayable.toFixed(2)),
      total: parseFloat(totalLiabilities.toFixed(2)),
    },
    equity: parseFloat(equity.toFixed(2)),
  });
}
