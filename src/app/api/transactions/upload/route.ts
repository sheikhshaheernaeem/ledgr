import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function detectColumns(headers: string[]) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return {
    date: lower.findIndex((h) => h.includes("date") || h.includes("time")),
    description: lower.findIndex(
      (h) =>
        h.includes("description") ||
        h.includes("memo") ||
        h.includes("narration") ||
        h.includes("details") ||
        h.includes("payee") ||
        h.includes("transaction")
    ),
    amount: lower.findIndex(
      (h) =>
        h.includes("amount") || h.includes("value") || h.includes("sum")
    ),
    type: lower.findIndex(
      (h) =>
        h.includes("type") ||
        h.includes("dr/cr") ||
        h.includes("debit/credit") ||
        h.includes("cr/dr")
    ),
    debit: lower.findIndex((h) => h === "debit" || h === "dr"),
    credit: lower.findIndex((h) => h === "credit" || h === "cr"),
  };
}

function parseCSV(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    const headers = rows[0];
    const cols = detectColumns(headers);

    if (cols.date === -1 || cols.description === -1) {
      return NextResponse.json(
        {
          error:
            "Could not detect date/description columns. Expected headers: date, description, amount, type",
        },
        { status: 400 }
      );
    }

    const dataRows = rows.slice(1);
    const transactions = [];

    for (const row of dataRows) {
      if (row.length < 2) continue;

      const dateStr = row[cols.date]?.trim();
      const description = row[cols.description]?.trim();
      if (!dateStr || !description) continue;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      let amount = 0;
      let type: "DEBIT" | "CREDIT" = "DEBIT";

      if (cols.debit !== -1 && cols.credit !== -1) {
        const debitVal = parseFloat(row[cols.debit]?.replace(/[,$]/g, "") || "0");
        const creditVal = parseFloat(row[cols.credit]?.replace(/[,$]/g, "") || "0");
        if (creditVal > 0) {
          amount = creditVal;
          type = "CREDIT";
        } else {
          amount = debitVal;
          type = "DEBIT";
        }
      } else if (cols.amount !== -1) {
        const raw = row[cols.amount]?.replace(/[,$]/g, "") || "0";
        amount = Math.abs(parseFloat(raw));
        if (cols.type !== -1) {
          const typeStr = row[cols.type]?.toLowerCase().trim() ?? "";
          type =
            typeStr.includes("cr") || typeStr.includes("credit")
              ? "CREDIT"
              : "DEBIT";
        } else {
          type = parseFloat(row[cols.amount]) > 0 ? "CREDIT" : "DEBIT";
        }
      }

      if (amount === 0 || isNaN(amount)) continue;

      transactions.push({
        userId: session.user.id as string,
        date,
        description,
        amount,
        type,
      });
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No valid transactions found in CSV" },
        { status: 400 }
      );
    }

    await prisma.transaction.createMany({ data: transactions });

    return NextResponse.json({ count: transactions.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}
