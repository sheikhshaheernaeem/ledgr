import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = request.nextUrl;
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  // month/year are optional — if omitted, export all transactions
  const hasMonthYear = !isNaN(month) && !isNaN(year);

  const whereClause = hasMonthYear
    ? {
        userId: session.user.id,
        status: "APPROVED",
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      }
    : { userId: session.user.id };

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { date: "asc" },
  });

  const escape = (val: string | null | undefined) => {
    if (val == null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header =
    "ID,Date,Description,Amount,Type,Category,Subcategory,Tax Category,Status,Is Recurring,Has Receipt,Bank Statement Ref";
  const rows = transactions.map((t) =>
    [
      escape(t.id),
      escape(t.date.toISOString().split("T")[0]),
      escape(t.description),
      escape(t.amount.toFixed(2)),
      escape(t.type),
      escape(t.category),
      escape(t.subcategory),
      escape(t.taxCategory),
      escape(t.status),
      escape(t.isRecurring ? "Yes" : "No"),
      escape(t.receiptData ? "Yes" : "No"),
      escape(t.bankStatementRef),
    ].join(",")
  );

  // UTF-8 BOM for Excel compatibility
  const bom = "﻿";
  const csv = bom + [header, ...rows].join("\n");

  const filename = hasMonthYear
    ? `transactions-${year}-${String(month).padStart(2, "0")}.csv`
    : "transactions.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
