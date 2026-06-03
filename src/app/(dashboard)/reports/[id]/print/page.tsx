import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const report = await prisma.report.findFirst({ where: { id, userId } });
  if (!report) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const startDate = new Date(report.year, report.month - 1, 1);
  const endDate = new Date(report.year, report.month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "APPROVED", date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });

  const income = transactions.filter((t) => t.type === "CREDIT");
  const expenses = transactions.filter((t) => t.type === "DEBIT");

  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  // Group expenses by category
  const byCat: Record<string, number> = {};
  expenses.forEach((t) => {
    const c = t.category ?? "Other";
    byCat[c] = (byCat[c] ?? 0) + t.amount;
  });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const monthName = startDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <html lang="en">
      <head>
        <title>P&L Report — {monthName}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: white; padding: 48px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; }
          .brand { font-size: 28px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .company-info p { font-size: 13px; color: #666; margin-top: 4px; }
          .report-meta { text-align: right; }
          .report-meta h1 { font-size: 20px; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.05em; }
          .report-meta .month { font-size: 15px; color: #444; margin-top: 6px; font-weight: 500; }
          .report-meta .status { display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 36px; }
          .summary-card { padding: 16px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
          .summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; margin-bottom: 6px; }
          .summary-card .value { font-size: 22px; font-weight: 800; }
          .value-income { color: #059669; }
          .value-expense { color: #dc2626; }
          .value-profit { color: #059669; }
          .value-loss { color: #dc2626; }
          section { margin-bottom: 32px; }
          section h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px; margin-bottom: 0; }
          .section-income h2 { background: #d1fae5; color: #065f46; border-radius: 6px 6px 0 0; }
          .section-expense h2 { background: #fee2e2; color: #991b1b; border-radius: 6px 6px 0 0; }
          table { width: 100%; border-collapse: collapse; }
          thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #999; font-weight: 600; padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left; }
          thead th:last-child { text-align: right; }
          tbody td { padding: 10px 12px; font-size: 13px; color: #111; border-bottom: 1px solid #f3f4f6; }
          tbody td:last-child { text-align: right; font-weight: 500; }
          .total-row td { font-weight: 700; font-size: 14px; background: #f9fafb; border-top: 2px solid #e5e7eb; }
          .net-profit { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-radius: 8px; margin-top: 16px; font-size: 18px; font-weight: 800; }
          .net-profit-pos { background: #d1fae5; color: #065f46; }
          .net-profit-neg { background: #fee2e2; color: #991b1b; }
          .cat-row { display: flex; justify-content: space-between; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          .cat-row:last-child { border-bottom: none; }
          .cat-total { display: flex; justify-content: space-between; padding: 12px 12px; font-size: 14px; font-weight: 700; background: #f9fafb; border-top: 2px solid #e5e7eb; }
          .ai-summary { margin-top: 28px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534; }
          .ai-summary strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a; margin-bottom: 6px; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #999; }
          @media print {
            body { padding: 24px; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* No-print controls */}
        <div className="no-print" style={{ marginBottom: "28px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => window.print()}
            style={{ background: "#059669", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            Print / Save PDF
          </button>
          <a
            href={`/reports/${id}`}
            style={{ padding: "8px 20px", border: "1px solid #e5e7eb", borderRadius: "6px", textDecoration: "none", color: "#111", fontSize: "14px" }}
          >
            ← Back
          </a>
        </div>

        {/* Header */}
        <div className="header">
          <div className="company-info">
            <div className="brand">Ledgr</div>
            {user?.name && <p>{user.name}</p>}
            {user?.email && <p>{user.email}</p>}
          </div>
          <div className="report-meta">
            <h1>Profit &amp; Loss Statement</h1>
            <div className="month">{monthName}</div>
            <span className="status">{report.status}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">Total Revenue</div>
            <div className="value value-income">{fmt(totalIncome)}</div>
          </div>
          <div className="summary-card">
            <div className="label">Total Expenses</div>
            <div className="value value-expense">{fmt(totalExpenses)}</div>
          </div>
          <div className="summary-card">
            <div className="label">Net Profit</div>
            <div className={`value ${netProfit >= 0 ? "value-profit" : "value-loss"}`}>
              {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
            </div>
          </div>
        </div>

        {/* Income section */}
        <section className="section-income">
          <h2>Revenue</h2>
          {income.length === 0 ? (
            <p style={{ padding: "16px 12px", fontSize: "13px", color: "#666" }}>
              No income transactions this month
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {income.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: "#666", whiteSpace: "nowrap" }}>
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td>{t.description}</td>
                    <td style={{ color: "#666" }}>{t.category ?? "—"}</td>
                    <td style={{ color: "#059669" }}>{fmt(t.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>Total Revenue</td>
                  <td style={{ color: "#059669" }}>{fmt(totalIncome)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        {/* Expenses by category */}
        <section className="section-expense">
          <h2>Expenses by Category</h2>
          {catRows.length === 0 ? (
            <p style={{ padding: "16px 12px", fontSize: "13px", color: "#666" }}>
              No expense transactions this month
            </p>
          ) : (
            <div>
              {catRows.map(([cat, amt]) => (
                <div key={cat} className="cat-row">
                  <span style={{ color: "#444" }}>{cat}</span>
                  <span style={{ fontWeight: 500, color: "#dc2626" }}>{fmt(amt)}</span>
                </div>
              ))}
              <div className="cat-total">
                <span>Total Expenses</span>
                <span style={{ color: "#dc2626" }}>{fmt(totalExpenses)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Net profit */}
        <div className={`net-profit ${netProfit >= 0 ? "net-profit-pos" : "net-profit-neg"}`}>
          <span>Net Profit</span>
          <span>
            {netProfit >= 0 ? "+" : ""}
            {fmt(netProfit)}
          </span>
        </div>

        {/* AI summary */}
        {report.aiSummary && (
          <div className="ai-summary">
            <strong>AI Summary</strong>
            {report.aiSummary}
          </div>
        )}

        <div className="footer">
          <p>Generated by Ledgr · AI-native bookkeeping · {new Date().toLocaleDateString()}</p>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.location.search.includes('auto=1')) { window.onload = () => window.print(); }`,
          }}
        />
      </body>
    </html>
  );
}
