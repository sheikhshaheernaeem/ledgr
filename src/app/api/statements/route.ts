import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorizeTransactions, RawTransaction } from "@/lib/gemini";

function parseCSV(text: string): RawTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(",").map((c) => c.trim().replace(/"/g, ""));

  const idx = {
    date: cols.findIndex((c) => c.includes("date")),
    desc: cols.findIndex((c) => c.includes("desc") || c.includes("narr") || c.includes("memo") || c.includes("details")),
    amount: cols.findIndex((c) => c === "amount" || c === "debit" || c === "credit" || c.includes("amount")),
    debit: cols.findIndex((c) => c === "debit" || c.includes("debit")),
    credit: cols.findIndex((c) => c === "credit" || c.includes("credit")),
  };

  const rows: RawTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));

    const dateStr = idx.date >= 0 ? parts[idx.date] : "";
    const desc = idx.desc >= 0 ? parts[idx.desc] : parts[1] ?? "Unknown";
    const date = new Date(dateStr);
    if (!dateStr || isNaN(date.getTime())) continue;

    let amount = 0;
    let type: "DEBIT" | "CREDIT" = "DEBIT";

    if (idx.debit >= 0 && idx.credit >= 0) {
      const debitVal = parseFloat(parts[idx.debit]?.replace(/[^0-9.-]/g, "") || "0") || 0;
      const creditVal = parseFloat(parts[idx.credit]?.replace(/[^0-9.-]/g, "") || "0") || 0;
      if (creditVal > 0) {
        amount = creditVal;
        type = "CREDIT";
      } else {
        amount = debitVal;
        type = "DEBIT";
      }
    } else if (idx.amount >= 0) {
      const raw = parseFloat(parts[idx.amount]?.replace(/[^0-9.-]/g, "") || "0") || 0;
      amount = Math.abs(raw);
      type = raw < 0 ? "DEBIT" : "CREDIT";
    }

    if (amount === 0) continue;
    rows.push({ date: date.toISOString().split("T")[0], description: desc, amount, type });
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 });
  }

  const text = await file.text();
  const raw = parseCSV(text);

  if (raw.length === 0) {
    return NextResponse.json({ error: "No valid transactions found in CSV. Check format: Date, Description, Amount columns required." }, { status: 400 });
  }

  const statement = await prisma.statement.create({
    data: {
      userId,
      filename: file.name,
      rowCount: raw.length,
      status: "PROCESSING",
      periodStart: new Date(raw[0].date),
      periodEnd: new Date(raw[raw.length - 1].date),
    },
  });

  try {
    const categorized = await categorizeTransactions(raw);

    const bankAccount = await prisma.bankAccount.findFirst({ where: { userId } });

    await prisma.transaction.createMany({
      data: categorized.map((tx) => ({
        userId,
        date: new Date(tx.date),
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        subcategory: tx.subcategory,
        confidence: tx.confidence,
        aiNotes: tx.aiNotes ?? null,
        status: "PENDING",
        source: "CSV_IMPORT",
        importId: statement.id,
        bankAccountId: bankAccount?.id ?? null,
      })),
    });

    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "CATEGORIZED" },
    });

    return NextResponse.json({
      statementId: statement.id,
      rowCount: raw.length,
      status: "CATEGORIZED",
    });
  } catch (err) {
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "ERROR", errorMsg: String(err) },
    });
    return NextResponse.json({ error: "Failed to categorize transactions" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const statements = await prisma.statement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(statements);
}
