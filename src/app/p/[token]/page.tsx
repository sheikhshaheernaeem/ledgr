import { prisma } from "@/lib/db";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const inv = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { lineItems: true, user: true },
  });

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!inv) {
    return (
      <html lang="en">
        <head>
          <title>Invoice Not Found</title>
          <style>{`
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: white; border-radius: 12px; padding: 48px; text-align: center; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 12px; }
            p { color: #666; font-size: 15px; }
          `}</style>
        </head>
        <body>
          <div className="card">
            <h1>Invoice Not Found</h1>
            <p>This invoice link is invalid or has expired.</p>
          </div>
        </body>
      </html>
    );
  }

  const balanceDue = inv.total - inv.amountPaid;
  const senderName = inv.user.name || inv.user.email;

  return (
    <html lang="en">
      <head>
        <title>Invoice {inv.invoiceNumber}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: #f3f4f6; padding: 40px 16px; }
          .page { background: white; max-width: 760px; margin: 0 auto; border-radius: 12px; padding: 48px; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
          .from-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #166534; margin-bottom: 32px; font-weight: 600; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
          .brand { font-size: 26px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .invoice-meta { text-align: right; }
          .invoice-meta h1 { font-size: 22px; font-weight: 700; color: #111; letter-spacing: 0.04em; }
          .invoice-meta .num { font-size: 15px; font-weight: 600; color: #111; margin-top: 4px; }
          .paid-stamp { display: inline-block; margin-top: 8px; padding: 6px 16px; background: #d1fae5; color: #065f46; border-radius: 100px; font-size: 14px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
          .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
          .status-PAID { background: #d1fae5; color: #065f46; }
          .status-SENT { background: #dbeafe; color: #1e40af; }
          .status-DRAFT { background: #f3f4f6; color: #374151; }
          .status-OVERDUE { background: #fee2e2; color: #991b1b; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; padding: 20px; background: #f9fafb; border-radius: 8px; }
          .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; margin-bottom: 8px; }
          .info-block p { font-size: 14px; color: #111; line-height: 1.5; }
          .dates { display: flex; gap: 28px; margin-bottom: 28px; }
          .date-item span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; display: block; margin-bottom: 4px; }
          .date-item strong { font-size: 14px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; padding: 8px 12px; background: #f9fafb; text-align: left; border-bottom: 1px solid #e5e7eb; }
          thead th:last-child { text-align: right; }
          tbody td { padding: 12px; font-size: 14px; color: #111; border-bottom: 1px solid #f3f4f6; }
          tbody td:nth-child(2), tbody td:nth-child(3) { text-align: center; }
          tbody td:last-child { text-align: right; }
          .totals { margin-left: auto; width: 280px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .totals-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 16px; }
          .totals-row.balance { color: #059669; font-weight: 700; font-size: 16px; padding-top: 6px; }
          .pay-section { margin-top: 36px; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center; }
          .pay-section p { font-size: 13px; color: #166534; margin-bottom: 10px; font-weight: 600; }
          .pay-btn { display: inline-block; background: #059669; color: white; padding: 12px 28px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 15px; }
          .pay-btn:hover { background: #047857; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #aaa; }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="from-banner">Invoice from {senderName}</div>

          <div className="header">
            <div>
              <div className="brand">Ledgr</div>
              {inv.user.name && (
                <p style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{inv.user.name}</p>
              )}
              {inv.user.email && (
                <p style={{ fontSize: "13px", color: "#999" }}>{inv.user.email}</p>
              )}
            </div>
            <div className="invoice-meta">
              <h1>INVOICE</h1>
              <div className="num">{inv.invoiceNumber}</div>
              {inv.status === "PAID" ? (
                <div className="paid-stamp">Paid</div>
              ) : (
                <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
              )}
            </div>
          </div>

          <div className="info-grid">
            <div className="info-block">
              <h3>Bill To</h3>
              <p style={{ fontWeight: 600 }}>{inv.clientName}</p>
              {inv.clientEmail && <p style={{ color: "#666" }}>{inv.clientEmail}</p>}
            </div>
            <div className="info-block" style={{ textAlign: "right" }}>
              <h3>{inv.status === "PAID" ? "Amount Paid" : "Amount Due"}</h3>
              <p style={{ fontSize: "28px", fontWeight: 800, color: inv.status === "PAID" ? "#059669" : "#111" }}>
                {inv.status === "PAID" ? fmt(inv.amountPaid) : fmt(balanceDue)}
              </p>
            </div>
          </div>

          <div className="dates">
            <div className="date-item">
              <span>Issue Date</span>
              <strong>
                {new Date(inv.issueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </div>
            <div className="date-item">
              <span>Due Date</span>
              <strong>
                {new Date(inv.dueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </div>
            {inv.paidAt && (
              <div className="date-item">
                <span>Paid On</span>
                <strong style={{ color: "#059669" }}>
                  {new Date(inv.paidAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="totals-row">
              <span style={{ color: "#666" }}>Subtotal</span>
              <span>{fmt(inv.subtotal)}</span>
            </div>
            {inv.taxRate > 0 && (
              <div className="totals-row">
                <span style={{ color: "#666" }}>Tax ({inv.taxRate}%)</span>
                <span>{fmt(inv.taxAmount)}</span>
              </div>
            )}
            <div className="totals-row total">
              <span>Total</span>
              <span>{fmt(inv.total)}</span>
            </div>
            {inv.amountPaid > 0 && inv.status !== "PAID" && (
              <div className="totals-row balance">
                <span>Balance Due</span>
                <span>{fmt(balanceDue)}</span>
              </div>
            )}
          </div>

          {inv.notes && (
            <div
              style={{
                marginTop: "32px",
                padding: "16px",
                background: "#f9fafb",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#555",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#999",
                }}
              >
                Notes
              </strong>
              {inv.notes}
            </div>
          )}

          {inv.user.paymentLink && inv.status !== "PAID" && (
            <div className="pay-section">
              <p>Pay this invoice securely online</p>
              <a
                href={inv.user.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="pay-btn"
              >
                Pay Now
              </a>
              <p style={{ fontSize: "11px", color: "#4b7c60", marginTop: "8px" }}>
                {inv.user.paymentLink}
              </p>
            </div>
          )}

          <div className="footer">
            <p>Generated by Ledgr · AI-native bookkeeping</p>
          </div>
        </div>
      </body>
    </html>
  );
}
