import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function startOfPeriod(months: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - months + 1);
  return d;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getQuarterKey(date: Date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

function buildPeriodBuckets(start: Date, end: Date, groupBy: string): string[] {
  const buckets: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (groupBy === "quarterly") {
      buckets.push(getQuarterKey(cur));
      cur.setMonth(cur.getMonth() + 3);
    } else {
      buckets.push(getMonthKey(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return [...new Set(buckets)];
}

function bucketKey(date: Date, groupBy: string) {
  return groupBy === "quarterly" ? getQuarterKey(date) : getMonthKey(date);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") ?? "revenue";
  const metric2 = searchParams.get("metric2") ?? "";
  const period = searchParams.get("period") ?? "6m";
  const groupBy = searchParams.get("groupBy") ?? "monthly";

  // Determine date range
  const periodMonths: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12, "2y": 24 };
  const months = periodMonths[period] ?? 6;
  const startDate = startOfPeriod(months);
  const endDate = new Date();

  const buckets = buildPeriodBuckets(startDate, endDate, groupBy);

  async function getSeriesData(m: string): Promise<{ label: string; data: { key: string; value: number }[]; type: "timeseries" | "breakdown" }> {
    switch (m) {
      case "revenue": {
        const txs = await prisma.transaction.findMany({
          where: { userId, type: "CREDIT", status: { in: ["APPROVED", "PENDING"] }, date: { gte: startDate, lte: endDate } },
          select: { amount: true, date: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const t of txs) map[bucketKey(new Date(t.date), groupBy)] = (map[bucketKey(new Date(t.date), groupBy)] ?? 0) + t.amount;
        return { label: "Revenue", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "expenses": {
        const txs = await prisma.transaction.findMany({
          where: { userId, type: "DEBIT", status: { in: ["APPROVED", "PENDING"] }, date: { gte: startDate, lte: endDate } },
          select: { amount: true, date: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const t of txs) map[bucketKey(new Date(t.date), groupBy)] = (map[bucketKey(new Date(t.date), groupBy)] ?? 0) + t.amount;
        return { label: "Expenses", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "profit": {
        const txs = await prisma.transaction.findMany({
          where: { userId, status: { in: ["APPROVED", "PENDING"] }, date: { gte: startDate, lte: endDate } },
          select: { amount: true, type: true, date: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const t of txs) {
          const k = bucketKey(new Date(t.date), groupBy);
          map[k] = (map[k] ?? 0) + (t.type === "CREDIT" ? t.amount : -t.amount);
        }
        return { label: "Net Profit", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "invoiced": {
        const invoices = await prisma.invoice.findMany({
          where: { userId, type: "INVOICE", issueDate: { gte: startDate, lte: endDate } },
          select: { total: true, issueDate: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const inv of invoices) map[bucketKey(new Date(inv.issueDate), groupBy)] = (map[bucketKey(new Date(inv.issueDate), groupBy)] ?? 0) + inv.total;
        return { label: "Invoiced", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "bills": {
        const bills = await prisma.bill.findMany({
          where: { userId, issueDate: { gte: startDate, lte: endDate } },
          select: { total: true, issueDate: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const b of bills) map[bucketKey(new Date(b.issueDate), groupBy)] = (map[bucketKey(new Date(b.issueDate), groupBy)] ?? 0) + b.total;
        return { label: "Bills", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "ar_balance": {
        const outstanding = await prisma.invoice.findMany({
          where: { userId, status: { in: ["SENT", "OVERDUE"] } },
          select: { total: true, amountPaid: true, issueDate: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const inv of outstanding) {
          const k = bucketKey(new Date(inv.issueDate), groupBy);
          if (map[k] !== undefined) map[k] += (inv.total - inv.amountPaid);
        }
        return { label: "AR Balance", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "ap_balance": {
        const outstanding = await prisma.bill.findMany({
          where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
          select: { total: true, amountPaid: true, issueDate: true },
        });
        const map: Record<string, number> = Object.fromEntries(buckets.map(b => [b, 0]));
        for (const bill of outstanding) {
          const k = bucketKey(new Date(bill.issueDate), groupBy);
          if (map[k] !== undefined) map[k] += (bill.total - bill.amountPaid);
        }
        return { label: "AP Balance", data: buckets.map(k => ({ key: k, value: Math.round((map[k] ?? 0) * 100) / 100 })), type: "timeseries" };
      }
      case "expense_by_category": {
        const txs = await prisma.transaction.findMany({
          where: { userId, type: "DEBIT", status: { in: ["APPROVED", "PENDING"] }, date: { gte: startDate, lte: endDate } },
          select: { amount: true, category: true },
        });
        const map: Record<string, number> = {};
        for (const t of txs) {
          const cat = t.category ?? "Uncategorized";
          map[cat] = (map[cat] ?? 0) + t.amount;
        }
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { label: "Expenses by Category", data: sorted.map(([k, v]) => ({ key: k, value: Math.round(v * 100) / 100 })), type: "breakdown" };
      }
      case "revenue_by_client": {
        const invoices = await prisma.invoice.findMany({
          where: { userId, type: "INVOICE", status: { in: ["PAID", "SENT", "OVERDUE"] }, issueDate: { gte: startDate, lte: endDate } },
          select: { clientName: true, total: true },
        });
        const map: Record<string, number> = {};
        for (const inv of invoices) map[inv.clientName] = (map[inv.clientName] ?? 0) + inv.total;
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { label: "Revenue by Client", data: sorted.map(([k, v]) => ({ key: k, value: Math.round(v * 100) / 100 })), type: "breakdown" };
      }
      case "budget_vs_actual": {
        const now2 = new Date();
        const budgets = await prisma.budget.findMany({
          where: { userId, year: now2.getFullYear() },
          select: { category: true, amount: true, month: true },
        });
        const txs = await prisma.transaction.findMany({
          where: { userId, type: "DEBIT", status: { in: ["APPROVED", "PENDING"] }, date: { gte: new Date(now2.getFullYear(), 0, 1), lte: now2 } },
          select: { amount: true, category: true },
        });
        const budgetMap: Record<string, number> = {};
        for (const b of budgets) budgetMap[b.category] = (budgetMap[b.category] ?? 0) + b.amount;
        const actualMap: Record<string, number> = {};
        for (const t of txs) { const cat = t.category ?? "Uncategorized"; actualMap[cat] = (actualMap[cat] ?? 0) + t.amount; }
        const cats = [...new Set([...Object.keys(budgetMap), ...Object.keys(actualMap)])].slice(0, 10);
        return {
          label: "Budget vs Actual",
          data: cats.map(c => ({ key: c, value: Math.round((actualMap[c] ?? 0) * 100) / 100, budget: Math.round((budgetMap[c] ?? 0) * 100) / 100 } as { key: string; value: number; budget?: number })),
          type: "breakdown",
        };
      }
      case "bank_balances": {
        const accounts = await prisma.bankAccount.findMany({
          where: { userId },
          select: { name: true, currentBalance: true },
        });
        return {
          label: "Bank Balances",
          data: accounts.map(a => ({ key: a.name, value: Math.round(a.currentBalance * 100) / 100 })),
          type: "breakdown",
        };
      }
      case "inventory_value": {
        const items = await prisma.inventoryItem.findMany({
          where: { userId, isActive: true },
          select: { name: true, quantityOnHand: true, costPrice: true, category: true },
        });
        const map: Record<string, number> = {};
        for (const it of items) {
          const cat = it.category ?? it.name;
          map[cat] = (map[cat] ?? 0) + it.quantityOnHand * it.costPrice;
        }
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return { label: "Inventory Value", data: sorted.map(([k, v]) => ({ key: k, value: Math.round(v * 100) / 100 })), type: "breakdown" };
      }
      default:
        return { label: m, data: buckets.map(k => ({ key: k, value: 0 })), type: "timeseries" };
    }
  }

  const [series1, series2] = await Promise.all([
    getSeriesData(metric),
    metric2 ? getSeriesData(metric2) : Promise.resolve(null),
  ]);

  return NextResponse.json({ series1, series2, buckets, period, groupBy, metric, metric2 });
}
