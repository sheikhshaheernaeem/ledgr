import { NextResponse } from "next/server";
import { z } from "zod";
import { jsPDF } from "jspdf";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const Schema = z.object({
  transactionIds: z.array(z.string()).min(1).max(2000),
  reportType: z.enum(["profit_loss", "expense_summary", "tax_summary"]).default("profit_loss"),
  title: z.string().max(120).optional(),
});

/**
 * POST /api/ai/generate-report
 *
 * Body: { transactionIds, reportType, title? }
 * Returns: application/pdf binary
 *
 * Also persists a Report row pointing to the included transactions so the
 * PDF can be re-downloaded later from /client/reports.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { transactionIds, reportType, title } = parsed.data;

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId },
    orderBy: { date: "asc" },
  });

  if (transactions.length === 0) {
    return NextResponse.json({ error: "No transactions found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, companyName: true, currency: true },
  });

  // ── Compute totals + category breakdown ──
  let income = 0, expenses = 0;
  const byCategory = new Map<string, { income: number; expense: number; count: number }>();
  for (const t of transactions) {
    if (t.type === "INCOME" || t.amount > 0) income += Math.abs(t.amount);
    else expenses += Math.abs(t.amount);
    const k = t.category ?? "Uncategorized";
    const row = byCategory.get(k) ?? { income: 0, expense: 0, count: 0 };
    if (t.type === "INCOME" || t.amount > 0) row.income += Math.abs(t.amount);
    else row.expense += Math.abs(t.amount);
    row.count++;
    byCategory.set(k, row);
  }
  const net = income - expenses;
  const currency = user?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  // ── Build PDF ──
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Brand bar
  doc.setFillColor(37, 99, 235);             // blue-600
  doc.rect(0, 0, pageW, 6, "F");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("Ledgr", margin, y + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("AI-native accounting", margin, y + 38);

  // Report title (right)
  const titleText = title ?? defaultTitle(reportType);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text(titleText, pageW - margin, y + 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageW - margin,
    y + 38,
    { align: "right" },
  );

  y += 60;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // Client info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(user?.companyName ?? user?.name ?? "Client", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`${transactions.length} transactions · ${currency}`, margin, y + 14);
  y += 36;

  // Totals row
  drawMetric(doc, "Income", fmt(income), margin, y, [16, 185, 129]);
  drawMetric(doc, "Expenses", fmt(expenses), margin + (pageW - margin * 2) / 3, y, [244, 63, 94]);
  drawMetric(doc, "Net profit", fmt(net), margin + ((pageW - margin * 2) / 3) * 2, y, net >= 0 ? [37, 99, 235] : [244, 63, 94]);
  y += 72;

  // Category breakdown table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("By category", margin, y);
  y += 16;

  const colW = [(pageW - margin * 2) * 0.45, (pageW - margin * 2) * 0.18, (pageW - margin * 2) * 0.18, (pageW - margin * 2) * 0.19];
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 12, pageW - margin * 2, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Category", margin + 6, y + 4);
  doc.text("Income", margin + colW[0], y + 4, { align: "left" });
  doc.text("Expense", margin + colW[0] + colW[1], y + 4, { align: "left" });
  doc.text("Count", margin + colW[0] + colW[1] + colW[2], y + 4, { align: "left" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const sortedCats = Array.from(byCategory.entries()).sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense));
  for (const [cat, row] of sortedCats) {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.text(cat, margin + 6, y);
    doc.setTextColor(16, 185, 129); doc.text(row.income > 0 ? fmt(row.income) : "—", margin + colW[0], y);
    doc.setTextColor(244, 63, 94);  doc.text(row.expense > 0 ? fmt(row.expense) : "—", margin + colW[0] + colW[1], y);
    doc.setTextColor(100, 116, 139); doc.text(String(row.count), margin + colW[0] + colW[1] + colW[2], y);
    doc.setTextColor(15, 23, 42);
    y += 16;
  }

  // Transactions section
  if (y > 660) { doc.addPage(); y = margin; }
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Transactions", margin, y);
  y += 16;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 12, pageW - margin * 2, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Date", margin + 6, y + 4);
  doc.text("Description", margin + 70, y + 4);
  doc.text("Category", margin + 310, y + 4);
  doc.text("Amount", pageW - margin - 6, y + 4, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const t of transactions) {
    if (y > 740) { doc.addPage(); y = margin; }
    const date = t.date.toISOString().slice(0, 10);
    const desc = t.description.length > 50 ? t.description.slice(0, 48) + "…" : t.description;
    const sign = t.type === "INCOME" || t.amount > 0 ? "+" : "-";
    doc.setTextColor(100, 116, 139); doc.text(date, margin + 6, y);
    doc.setTextColor(15, 23, 42);    doc.text(desc, margin + 70, y);
    doc.setTextColor(100, 116, 139); doc.text(t.category ?? "—", margin + 310, y);
    doc.setTextColor(t.type === "INCOME" || t.amount > 0 ? 16 : 244, t.type === "INCOME" || t.amount > 0 ? 185 : 63, t.type === "INCOME" || t.amount > 0 ? 129 : 94);
    doc.text(`${sign}${fmt(Math.abs(t.amount))}`, pageW - margin - 6, y, { align: "right" });
    y += 14;
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by Ledgr AI · Llama 3.3 70B + FinBERT · ${new Date().toISOString()}`,
    margin,
    doc.internal.pageSize.getHeight() - 24,
  );

  // Output PDF
  const arrayBuffer = doc.output("arraybuffer");
  const pdfBytes = Buffer.from(arrayBuffer);

  // ── Persist Report row ──
   
  const now = new Date();
  try {
    const report = await prisma.report.create({
      data: {
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalIncome: income,
        totalExpenses: expenses,
        netProfit: net,
        status: "GENERATED",
        aiSummary: `${reportType.replace(/_/g, " ")} · ${transactions.length} txns · ${fmt(income)} in / ${fmt(expenses)} out / net ${fmt(net)}`,
      },
    });
    await prisma.transaction.updateMany({
      where: { id: { in: transactionIds }, userId },
      data: { reportId: report.id },
    });
  } catch {
    // non-fatal
  }

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ledgr-${reportType}-${now.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function defaultTitle(t: string): string {
  if (t === "profit_loss") return "Profit & Loss";
  if (t === "expense_summary") return "Expense Summary";
  if (t === "tax_summary") return "Tax Summary";
  return "Financial Report";
}

function drawMetric(doc: jsPDF, label: string, value: string, x: number, y: number, color: [number, number, number]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(value, x, y + 20);
}
