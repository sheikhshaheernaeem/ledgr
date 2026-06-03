import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const inv = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id as string },
    include: { lineItems: true },
  });
  if (!inv) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { name: true, email: true, paymentLink: true, companyName: true, companyAddress: true, companyLogo: true },
  });

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", PKR: "₨", CAD: "C$", AUD: "A$", AED: "د.إ",
  };
  const symbol = CURRENCY_SYMBOLS[inv.currency ?? "USD"] ?? (inv.currency + " ");
  const fmt = (n: number) => `${symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <html lang="en">
      <head>
        <title>Invoice {inv.invoiceNumber}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: white; padding: 48px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .brand { font-size: 28px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .invoice-meta { text-align: right; }
          .invoice-meta h1 { font-size: 24px; font-weight: 700; color: #111; }
          .invoice-meta p { font-size: 14px; color: #666; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; padding: 24px; background: #f9fafb; border-radius: 8px; }
          .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; margin-bottom: 8px; }
          .info-block p { font-size: 14px; color: #111; line-height: 1.5; }
          .dates { display: flex; gap: 32px; margin-bottom: 32px; }
          .date-item { }
          .date-item span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; display: block; margin-bottom: 4px; }
          .date-item strong { font-size: 14px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; padding: 8px 12px; background: #f9fafb; text-align: left; border-bottom: 1px solid #e5e7eb; }
          thead th:last-child { text-align: right; }
          tbody td { padding: 12px 12px; font-size: 14px; color: #111; border-bottom: 1px solid #f3f4f6; }
          tbody td:nth-child(2), tbody td:nth-child(3) { text-align: center; }
          tbody td:last-child { text-align: right; }
          .totals { margin-left: auto; width: 280px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .totals-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 16px; }
          .notes { margin-top: 40px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #555; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
          .status-PAID { background: #d1fae5; color: #065f46; }
          .status-SENT { background: #dbeafe; color: #1e40af; }
          .status-DRAFT { background: #f3f4f6; color: #374151; }
          .status-OVERDUE { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #999; }
          @media print {
            body { padding: 24px; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print" style={{ marginBottom: "24px", display: "flex", gap: "12px" }}>
          <button onClick={() => window.print()} style={{ background: "#059669", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
            Print / Save PDF
          </button>
          <a href={`/invoices/${id}`} style={{ padding: "8px 20px", border: "1px solid #e5e7eb", borderRadius: "6px", textDecoration: "none", color: "#111", fontSize: "14px" }}>
            ← Back
          </a>
        </div>

        <div className="header">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {user?.companyLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.companyLogo} alt="Company logo" style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }} />
            )}
            <div>
              <div className="brand">{user?.companyName ?? "Ledgr"}</div>
              {!user?.companyName && user?.name && <p style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{user.name}</p>}
              {user?.companyAddress && <p style={{ fontSize: "13px", color: "#666", marginTop: "2px", whiteSpace: "pre-line" }}>{user.companyAddress}</p>}
              {user?.email && <p style={{ fontSize: "13px", color: "#999" }}>{user.email}</p>}
            </div>
          </div>
          <div className="invoice-meta">
            <h1>{inv.type === "QUOTE" ? "QUOTE" : "INVOICE"}</h1>
            <p style={{ fontWeight: 600, color: "#111" }}>{inv.invoiceNumber}</p>
            <p>
              <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
            </p>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-block">
            <h3>Bill To</h3>
            <p style={{ fontWeight: 600 }}>{inv.clientName}</p>
            {inv.clientEmail && <p style={{ color: "#666" }}>{inv.clientEmail}</p>}
          </div>
          <div className="info-block" style={{ textAlign: "right" }}>
            <h3>Amount Due</h3>
            <p style={{ fontSize: "28px", fontWeight: "800", color: inv.status === "PAID" ? "#059669" : "#111" }}>{fmt(inv.total)}</p>
          </div>
        </div>

        <div className="dates">
          <div className="date-item"><span>Issue Date</span><strong>{new Date(inv.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
          <div className="date-item"><span>Due Date</span><strong>{new Date(inv.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
          {inv.paidAt && <div className="date-item"><span>Paid On</span><strong style={{ color: "#059669" }}>{new Date(inv.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></div>}
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
            {inv.lineItems.map(item => (
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
          <div className="totals-row"><span style={{ color: "#666" }}>Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
          {inv.taxRate > 0 && <div className="totals-row"><span style={{ color: "#666" }}>Tax ({inv.taxRate}%)</span><span>{fmt(inv.taxAmount)}</span></div>}
          <div className="totals-row total"><span>Total</span><span>{fmt(inv.total)}</span></div>
        </div>

        {inv.notes && (
          <div className="notes">
            <strong style={{ display: "block", marginBottom: "6px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#999" }}>Notes</strong>
            {inv.notes}
          </div>
        )}

        {user?.paymentLink && inv.status !== "PAID" && (
          <div style={{ marginTop: "32px", padding: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "#166534", marginBottom: "8px", fontWeight: "600" }}>Pay this invoice online</p>
            <a href={user.paymentLink} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#059669", color: "white", padding: "10px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: "700", fontSize: "14px" }}>
              Pay Now
            </a>
            <p style={{ fontSize: "11px", color: "#4b7c60", marginTop: "8px" }}>{user.paymentLink}</p>
          </div>
        )}

        <div className="footer">
          <p>Generated by Ledgr · AI-native bookkeeping</p>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          // Auto-focus print for direct /print URL visits
          if (window.location.search.includes('auto=1')) { window.onload = () => window.print(); }
        `}} />
      </body>
    </html>
  );
}
