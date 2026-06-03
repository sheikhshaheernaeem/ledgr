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

  if (!month || !year || isNaN(month) || isNaN(year)) {
    return new Response(JSON.stringify({ error: "month and year are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
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

  const header = "Date,Description,Amount,Type,Category,Subcategory,Status,Tax Category,Tax Line,Reconciled";
  const rows = transactions.map((t) =>
    [
      escape(t.date.toISOString().split("T")[0]),
      escape(t.description),
      escape(t.amount.toFixed(2)),
      escape(t.type),
      escape(t.category),
      escape(t.subcategory),
      escape(t.status),
      escape(t.taxCategory),
      escape(t.taxLine),
      escape(t.reconciled ? "Yes" : "No"),
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
