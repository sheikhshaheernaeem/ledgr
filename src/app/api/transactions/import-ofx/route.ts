import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseOFX(raw: string): Array<{ date: string; amount: number; description: string; fitid: string }> {
  const results: Array<{ date: string; amount: number; description: string; fitid: string }> = [];
  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = txRegex.exec(raw)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>([^<\n\r]+)`, "i").exec(block);
      return m ? m[1].trim() : "";
    };
    const dateRaw = get("DTPOSTED");
    const year = dateRaw.slice(0, 4);
    const month = dateRaw.slice(4, 6);
    const day = dateRaw.slice(6, 8);
    const date = `${year}-${month}-${day}`;
    const amount = parseFloat(get("TRNAMT")) || 0;
    const description = get("MEMO") || get("NAME") || get("PAYEE") || "Unknown";
    const fitid = get("FITID");
    if (date && amount !== 0) {
      results.push({ date, amount, description, fitid });
    }
  }
  return results;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const accountId = formData.get("accountId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const parsed = parseOFX(text);

  if (parsed.length === 0) return NextResponse.json({ error: "No transactions found in file" }, { status: 400 });

  let imported = 0;
  let skipped = 0;

  for (const tx of parsed) {
    const existing = await prisma.transaction.findFirst({
      where: { userId: session.user.id, importId: tx.fitid },
    });
    if (existing) { skipped++; continue; }

    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        date: new Date(tx.date),
        amount: tx.amount,
        description: tx.description,
        category: "Uncategorized",
        type: tx.amount > 0 ? "INCOME" : "EXPENSE",
        source: "OFX_IMPORT",
        importId: tx.fitid,
        accountId: accountId ?? undefined,
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, total: parsed.length });
}
