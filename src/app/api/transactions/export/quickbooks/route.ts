import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function fmtDateQB(date: Date | string): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function escapeCsv(val: string | null | undefined): string {
  const s = val ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  // QuickBooks Online import format columns:
  // Date, Description, Amount, Account, Category (Memo), Type
  const BOM = "﻿";
  const header = "Date,Description,Amount,Account,Memo,Type";

  const lines = transactions.map((tx) => {
    const date = escapeCsv(fmtDateQB(tx.date));
    const description = escapeCsv(tx.description);
    const amount = tx.amount.toFixed(2); // always positive
    const account = escapeCsv(tx.category ?? "Unchecked Account");
    const memo = escapeCsv(tx.subcategory ?? tx.category ?? "");
    const type = tx.type === "CREDIT" ? "Income" : "Expense";
    return `${date},${description},${amount},${account},${memo},${type}`;
  });

  const csv = BOM + header + "\n" + lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="quickbooks-import.csv"',
    },
  });
}
