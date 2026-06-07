import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { movements: { orderBy: { date: "asc" }, where: { type: "PURCHASE" } } },
  });

  const valuations = items.map(item => {
    let cogsValue = 0;
    let inventoryValue = 0;

    if (item.costMethod === "FIFO") {
      // FIFO: calculate from oldest purchases
      let remainingQty = item.quantityOnHand;
      const purchases = [...item.movements].reverse(); // newest first
      for (const m of purchases) {
        if (remainingQty <= 0) break;
        const usedQty = Math.min(m.quantity, remainingQty);
        inventoryValue += usedQty * m.unitCost;
        remainingQty -= usedQty;
      }
      // COGS = total purchases cost - remaining inventory value
      const totalPurchaseCost = item.movements.reduce((s, m) => s + m.totalCost, 0);
      cogsValue = totalPurchaseCost - inventoryValue;
    } else if (item.costMethod === "LIFO") {
      // LIFO: value remaining inventory using oldest costs
      let remainingQty = item.quantityOnHand;
      const purchases = [...item.movements]; // oldest first
      for (const m of purchases) {
        if (remainingQty <= 0) break;
        const usedQty = Math.min(m.quantity, remainingQty);
        inventoryValue += usedQty * m.unitCost;
        remainingQty -= usedQty;
      }
      const totalPurchaseCost = item.movements.reduce((s, m) => s + m.totalCost, 0);
      cogsValue = totalPurchaseCost - inventoryValue;
    } else {
      // Weighted Average
      const totalQty = item.movements.reduce((s, m) => s + m.quantity, 0);
      const totalCost = item.movements.reduce((s, m) => s + m.totalCost, 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : item.costPrice;
      inventoryValue = item.quantityOnHand * avgCost;
      cogsValue = totalCost - inventoryValue;
    }

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      costMethod: item.costMethod,
      quantityOnHand: item.quantityOnHand,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      inventoryValue,
      cogsValue,
      potentialRevenue: item.quantityOnHand * item.sellPrice,
      potentialMargin: item.sellPrice > 0 ? ((item.sellPrice - item.costPrice) / item.sellPrice) * 100 : 0,
    };
  });

  const totals = {
    totalInventoryValue: valuations.reduce((s, v) => s + v.inventoryValue, 0),
    totalCogsValue: valuations.reduce((s, v) => s + v.cogsValue, 0),
    totalPotentialRevenue: valuations.reduce((s, v) => s + v.potentialRevenue, 0),
  };

  return NextResponse.json({ valuations, totals });
}
