import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export default async function ClientStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { id } = await params;
  const { year: yearStr, month: monthStr } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id as string },
  });
  if (!client) notFound();

  // Build date filter
  const year = yearStr ? parseInt(yearStr) : null;
  const month = monthStr ? parseInt(monthStr) : null;

  let dateFilter: { gte?: Date; lt?: Date } | undefined;
  if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    dateFilter = { gte: start, lt: end };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    dateFilter = { gte: start, lt: end };
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id as string,
      OR: [
        { clientId: id },
        { clientName: client.name },
      ],
      ...(dateFilter ? { issueDate: dateFilter } : {}),
    },
    include: { lineItems: true },
    orderBy: { issueDate: "asc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { name: true, email: true, companyName: true, companyAddress: true, companyLogo: true },
  });

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalBalance = totalBilled - totalPaid;

  const periodLabel = year && month
    ? new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
    : year
    ? String(year)
    : "All Time";

  return (
    <html lang="en">
      <head>
        <title>Statement — {client.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: white; padding: 48px; max-width: 900px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .brand { font-size: 24px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .brand-block { display: flex; align-items: flex-start; gap: 12px; }
          .brand-logo { max-height: 48px; width: auto; object-fit: contain; }
          .meta { text-align: right; }
          .meta h1 { font-size: 22px; font-weight: 700; color: #111; }
          .meta p { font-size: 13px; color: #666; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; padding: 20px; background: #f9fafb; border-radius: 8px; }
          .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; margin-bottom: 6px; }
          .info-block p { font-size: 14px; color: #111; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; padding: 8px 12px; background: #f9fafb; text-align: left; border-bottom: 1px solid #e5e7eb; }
          thead th:last-child, thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
          tbody td { padding: 10px 12px; font-size: 13px; color: #111; border-bottom: 1px solid #f3f4f6; }
          tbody td:nth-child(4), tbody td:nth-child(5), tbody td:nth-child(6) { text-align: right; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 600; }
          .status-PAID { background: #d1fae5; color: #065f46; }
          .status-SENT { background: #dbeafe; color: #1e40af; }
          .status-DRAFT { background: #f3f4f6; color: #374151; }
          .status-OVERDUE { background: #fee2e2; color: #991b1b; }
          .summary { margin-left: auto; width: 300px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .summary-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 16px; }
          .summary-row.balance { color: #059669; font-weight: 700; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #999; }
          @media print {
            body { padding: 24px; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print" style={{ marginBottom: "24px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => window.print()}
            style={{ background: "#059669", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            Print / Save PDF
          </button>
          <a href={`/clients`} style={{ padding: "8px 20px", border: "1px solid #e5e7eb", borderRadius: "6px", textDecoration: "none", color: "#111", fontSize: "14px" }}>
            ← Back to Clients
          </a>
        </div>

        <div className="header">
          <div className="brand-block">
            {user?.companyLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.companyLogo} alt="Company logo" className="brand-logo" />
            )}
            <div>
              <div className="brand">{user?.companyName ?? user?.name ?? "Ledgr"}</div>
              {user?.companyAddress && <p style={{ fontSize: "13px", color: "#666", marginTop: "2px", whiteSpace: "pre-line" }}>{user.companyAddress}</p>}
              {user?.email && <p style={{ fontSize: "13px", color: "#999" }}>{user.email}</p>}
            </div>
          </div>
          <div className="meta">
            <h1>CLIENT STATEMENT</h1>
            <p>{periodLabel}</p>
            <p style={{ marginTop: "8px", fontSize: "11px", color: "#aaa" }}>Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-block">
            <h3>Bill To</h3>
            <p style={{ fontWeight: 600 }}>{client.name}</p>
            {client.company && <p style={{ color: "#666" }}>{client.company}</p>}
            {client.email && <p style={{ color: "#666" }}>{client.email}</p>}
            {client.phone && <p style={{ color: "#666" }}>{client.phone}</p>}
            {client.address && <p style={{ color: "#666" }}>{client.address}</p>}
          </div>
          <div className="info-block" style={{ textAlign: "right" }}>
            <h3>Summary</h3>
            <p><span style={{ color: "#666" }}>Period: </span>{periodLabel}</p>
            <p><span style={{ color: "#666" }}>Invoices: </span>{invoices.length}</p>
            <p style={{ marginTop: "8px", fontSize: "20px", fontWeight: "800", color: totalBalance > 0 ? "#b91c1c" : "#059669" }}>
              {fmt(totalBalance)} {totalBalance > 0 ? "due" : "balanced"}
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666", padding: "40px 0" }}>No invoices found for this period.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const balance = inv.total - inv.amountPaid;
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>{new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td>{new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td><span className={`status-badge status-${inv.status}`}>{inv.status}</span></td>
                    <td>{fmt(inv.total)}</td>
                    <td style={{ color: inv.amountPaid > 0 ? "#059669" : "#aaa" }}>{fmt(inv.amountPaid)}</td>
                    <td style={{ fontWeight: balance > 0 ? 700 : 400, color: balance > 0 ? "#b91c1c" : "#059669" }}>{fmt(balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="summary">
          <div className="summary-row"><span style={{ color: "#666" }}>Total Billed</span><span>{fmt(totalBilled)}</span></div>
          <div className="summary-row"><span style={{ color: "#666" }}>Total Paid</span><span style={{ color: "#059669" }}>{fmt(totalPaid)}</span></div>
          <div className={`summary-row ${totalBalance > 0 ? "total" : "summary-row balance"}`}>
            <span>Balance Due</span>
            <span style={{ color: totalBalance > 0 ? "#b91c1c" : "#059669" }}>{fmt(totalBalance)}</span>
          </div>
        </div>

        <div className="footer">
          <p>Generated by Ledgr · AI-native bookkeeping</p>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          if (window.location.search.includes('auto=1')) { window.onload = () => window.print(); }
        `}} />
      </body>
    </html>
  );
}
