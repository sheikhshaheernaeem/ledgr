import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorizeTransactions, RawTransaction } from "@/lib/gemini";

// ─── Proper RFC 4180 CSV parser ───────────────────────────────────────────────
// Handles: quoted fields, commas inside quotes, escaped quotes (""), BOM, CRLF

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

// ─── Date parsing — try many bank formats ────────────────────────────────────

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  raw = raw.trim();

  // ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // US: 01/15/2024 or 01-15-2024
  const us = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (us) {
    const d = new Date(`${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Short year: 01/15/24
  const usShort = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (usShort) {
    const yr = parseInt(usShort[3]) + (parseInt(usShort[3]) > 50 ? 1900 : 2000);
    const d = new Date(`${yr}-${usShort[1].padStart(2, "0")}-${usShort[2].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // UK/AU: 15/01/2024 or 15-01-2024 (day first — only if day > 12)
  const uk = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (uk && parseInt(uk[1]) > 12) {
    const d = new Date(`${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Named month: 15 Jan 2024 | Jan 15, 2024 | 15-Jan-2024
  const named = raw.match(/(\d{1,2})[\s\-]([A-Za-z]{3,})[\s,\-]+(\d{4})/);
  if (named) {
    const d = new Date(`${named[2]} ${named[1]}, ${named[3]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const named2 = raw.match(/([A-Za-z]{3,})[\s\-](\d{1,2}),?\s*(\d{4})/);
  if (named2) {
    const d = new Date(`${named2[1]} ${named2[2]}, ${named2[3]}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Last fallback
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Column detection — fuzzy match bank header variants ─────────────────────

function detectColumns(headers: string[]) {
  const h = headers.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const dateKw = ["date", "transactiondate", "postdate", "posteddate", "valuedate", "txndate", "settledate", "bookdate"];
  const descKw = ["description", "desc", "memo", "narration", "narrative", "details", "particular", "particulars", "reference", "transactiondescription", "txndescription", "payee", "merchantname"];
  const amtKw = ["amount", "transactionamount", "txnamount", "netamount", "value"];
  const debitKw = ["debit", "debitamount", "withdrawal", "withdrawals", "dr", "out", "payments"];
  const creditKw = ["credit", "creditamount", "deposit", "deposits", "cr", "in", "receipts"];

  const find = (keywords: string[]) => h.findIndex((c) => keywords.some((k) => c === k || c.includes(k)));

  return {
    date: find(dateKw),
    desc: find(descKw),
    amount: find(amtKw),
    debit: find(debitKw),
    credit: find(creditKw),
  };
}

// ─── Parse amount — strip currency symbols, parentheses, etc. ─────────────────

function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Parentheses = negative: (50.00) → -50.00
  const negative = raw.includes("(") || raw.startsWith("-");
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned) || 0;
  return negative ? -val : val;
}

// ─── Main CSV → RawTransaction parser ────────────────────────────────────────

function parseCSV(text: string): RawTransaction[] {
  // Strip BOM
  const clean = text.replace(/^﻿/, "").trim();
  const allLines = clean.split(/\r?\n/);

  // Find first line that looks like a header (has "date" or "amount" etc.)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, allLines.length); i++) {
    const lower = allLines[i].toLowerCase();
    if (lower.includes("date") || lower.includes("amount") || lower.includes("debit") || lower.includes("credit")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = parseCSVLine(allLines[headerIdx]);
  const idx = detectColumns(headers);

  // Need at least date + (amount OR debit/credit)
  if (idx.date === -1) return [];
  if (idx.amount === -1 && idx.debit === -1 && idx.credit === -1) return [];

  const rows: RawTransaction[] = [];

  for (let i = headerIdx + 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 2) continue;

    const dateRaw = idx.date >= 0 ? (parts[idx.date] ?? "") : "";
    const date = parseDate(dateRaw);
    if (!date) continue;

    const desc = idx.desc >= 0 ? (parts[idx.desc] ?? "Unknown") : (parts[1] ?? "Unknown");

    let amount = 0;
    let type: "DEBIT" | "CREDIT" = "DEBIT";

    if (idx.debit >= 0 && idx.credit >= 0) {
      const debitVal = Math.abs(parseAmount(parts[idx.debit] ?? ""));
      const creditVal = Math.abs(parseAmount(parts[idx.credit] ?? ""));
      if (creditVal > 0) {
        amount = creditVal;
        type = "CREDIT";
      } else {
        amount = debitVal;
        type = "DEBIT";
      }
    } else if (idx.amount >= 0) {
      const raw = parseAmount(parts[idx.amount] ?? "");
      amount = Math.abs(raw);
      type = raw < 0 ? "DEBIT" : "CREDIT";
    }

    if (amount === 0) continue;

    rows.push({
      date: date.toISOString().split("T")[0],
      description: desc || "Unknown",
      amount,
      type,
    });
  }

  return rows;
}

// ─── API handlers ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Please upload a CSV file exported from your bank" }, { status: 400 });
  }

  const text = await file.text();
  const raw = parseCSV(text);

  if (raw.length === 0) {
    return NextResponse.json({
      error: "No transactions found. Make sure your CSV has Date, Description, and Amount columns. Try exporting directly from your bank's website.",
    }, { status: 400 });
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

    return NextResponse.json({ statementId: statement.id, rowCount: raw.length, status: "CATEGORIZED" });
  } catch (err) {
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "ERROR", errorMsg: String(err) },
    });
    return NextResponse.json({ error: "Failed to process transactions. Please try again." }, { status: 500 });
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
