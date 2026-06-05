// Email templates for Ledgr — all functions return HTML strings

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InvoiceSentParams {
  invoiceNumber: string;
  clientName: string;
  senderName: string;
  amount: number;
  currency: string;
  dueDate: Date | string;
  paymentLink?: string | null;
}

export function invoiceSentEmail(p: InvoiceSentParams): string {
  const payBtn = p.paymentLink
    ? `<tr><td align="center" style="padding-top:28px;">
        <a href="${p.paymentLink}"
           style="background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:15px;display:inline-block;
                  letter-spacing:0.3px;">
          Pay Now
        </a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#059669;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ledgr</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a7f3d0;letter-spacing:1px;text-transform:uppercase;">AI-native bookkeeping</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Invoice</p>
            <h1 style="margin:0 0 4px;font-size:24px;color:#111827;font-weight:700;">${p.invoiceNumber}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">from <strong>${p.senderName}</strong></p>

            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${p.clientName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              You have received an invoice from <strong>${p.senderName}</strong>.
              Please review and arrange payment at your earliest convenience.
            </p>
          </td>
        </tr>

        <!-- Amount card -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:0;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#059669;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Amount Due</p>
                  <p style="margin:0;font-size:36px;font-weight:800;color:#065f46;letter-spacing:-1px;">${fmtCurrency(p.amount, p.currency)}</p>
                </td>
                <td style="padding:20px 24px;text-align:right;vertical-align:middle;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Due Date</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#374151;">${fmtDate(p.dueDate)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        ${payBtn ? `<tr><td style="padding:0 32px;">${payBtn.replace(/<tr>|<\/tr>/g, "").replace(/<td[^>]*>|<\/td>/g, "")}</td></tr>` : ""}

        <!-- Footer -->
        <tr>
          <td style="padding:32px;border-top:1px solid #e5e7eb;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Sent via <strong style="color:#059669;">Ledgr</strong> · AI-native bookkeeping
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface InvoiceReminderParams {
  invoiceNumber: string;
  clientName: string;
  senderName: string;
  amount: number;
  currency: string;
  dueDate: Date | string;
  daysOverdue: number;
  paymentLink?: string | null;
}

export function invoiceReminderEmail(p: InvoiceReminderParams): string {
  const payBtn = p.paymentLink
    ? `<a href="${p.paymentLink}"
         style="background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;
                letter-spacing:0.3px;">
        Pay Now
       </a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header — red for overdue -->
        <tr>
          <td style="background:#dc2626;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ledgr</p>
            <p style="margin:4px 0 0;font-size:12px;color:#fecaca;letter-spacing:1px;text-transform:uppercase;">Payment Reminder</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 0;">
            <!-- Overdue badge -->
            <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:20px;
                        padding:6px 16px;margin-bottom:20px;">
              <span style="font-size:13px;font-weight:700;color:#dc2626;">${p.daysOverdue} day${p.daysOverdue !== 1 ? "s" : ""} overdue</span>
            </div>

            <h1 style="margin:0 0 4px;font-size:22px;color:#111827;font-weight:700;">Invoice ${p.invoiceNumber}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">from <strong>${p.senderName}</strong></p>

            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${p.clientName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              This is a reminder that invoice <strong>${p.invoiceNumber}</strong> was due on
              <strong>${fmtDate(p.dueDate)}</strong> and is now
              <span style="color:#dc2626;font-weight:700;">${p.daysOverdue} day${p.daysOverdue !== 1 ? "s" : ""} overdue</span>.
              Please arrange payment as soon as possible to avoid any disruption.
            </p>
          </td>
        </tr>

        <!-- Amount card -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#dc2626;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Outstanding Amount</p>
                  <p style="margin:0;font-size:36px;font-weight:800;color:#991b1b;letter-spacing:-1px;">${fmtCurrency(p.amount, p.currency)}</p>
                </td>
                <td style="padding:20px 24px;text-align:right;vertical-align:middle;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Was Due</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#374151;">${fmtDate(p.dueDate)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        ${payBtn ? `<tr><td style="padding:24px 32px 0;text-align:center;">${payBtn}</td></tr>` : ""}

        <!-- Footer -->
        <tr>
          <td style="padding:32px;border-top:1px solid #e5e7eb;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Sent via <strong style="color:#059669;">Ledgr</strong> · AI-native bookkeeping
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface WeeklyDigestParams {
  userName: string;
  income: number;
  expenses: number;
  net: number;
  currency: string;
  pendingInvoices: number;
  dashboardUrl: string;
  weekStart?: Date;
  weekEnd?: Date;
}

export function weeklyDigestEmail(p: WeeklyDigestParams): string {
  const now = p.weekEnd ?? new Date();
  const weekAgo = p.weekStart ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekRange = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const netColor = p.net >= 0 ? "#059669" : "#dc2626";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

        <!-- Header -->
        <tr>
          <td style="background:#059669;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ledgr</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a7f3d0;letter-spacing:1px;text-transform:uppercase;">Weekly Digest</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <h2 style="margin:0 0 4px;font-size:20px;color:#f1f5f9;font-weight:700;">Your Weekly Summary</h2>
            <p style="margin:0;font-size:13px;color:#64748b;">${weekRange}</p>
            <p style="margin:16px 0 0;font-size:15px;color:#94a3b8;line-height:1.6;">
              Hi ${p.userName}, here's your financial snapshot for the past 7 days.
            </p>
          </td>
        </tr>

        <!-- Stats row (3 cols) -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:33%;padding:0 4px 0 0;">
                  <table width="100%" style="background:#0f172a;border-radius:10px;border:1px solid #1e3a2e;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Income</p>
                        <p style="margin:0;font-size:20px;font-weight:800;color:#059669;">${fmtCurrency(p.income, p.currency)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="width:33%;padding:0 2px;">
                  <table width="100%" style="background:#0f172a;border-radius:10px;border:1px solid #3b1d1d;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Expenses</p>
                        <p style="margin:0;font-size:20px;font-weight:800;color:#ef4444;">${fmtCurrency(p.expenses, p.currency)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="width:33%;padding:0 0 0 4px;">
                  <table width="100%" style="background:#0f172a;border-radius:10px;border:1px solid #334155;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Net</p>
                        <p style="margin:0;font-size:20px;font-weight:800;color:${netColor};">${p.net >= 0 ? "+" : ""}${fmtCurrency(Math.abs(p.net), p.currency)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pending invoices -->
        ${
          p.pendingInvoices > 0
            ? `<tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" style="background:#1c1f26;border-radius:10px;border:1px solid #f59e0b33;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:14px;color:#fbbf24;font-weight:600;">
                    ⏳ ${p.pendingInvoices} pending invoice${p.pendingInvoices !== 1 ? "s" : ""}
                  </p>
                  <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Review and follow up to keep cash flow healthy.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ""
        }

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${p.dashboardUrl}"
               style="background:#059669;color:#ffffff;padding:14px 36px;border-radius:8px;
                      text-decoration:none;font-weight:700;font-size:15px;display:inline-block;
                      letter-spacing:0.3px;">
              View Dashboard
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
              Sent via <strong style="color:#059669;">Ledgr</strong> · AI-native bookkeeping
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface ReportApprovalParams {
  monthName: string;
  senderName: string;
  clientEmail: string;
  approvalUrl: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export function reportApprovalEmail(p: ReportApprovalParams): string {
  const netColor = p.netProfit >= 0 ? "#059669" : "#dc2626";
  const netSign = p.netProfit >= 0 ? "+" : "-";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#059669;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ledgr</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a7f3d0;letter-spacing:1px;text-transform:uppercase;">Monthly Report Ready</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 0;">
            <h1 style="margin:0 0 4px;font-size:24px;color:#111827;font-weight:700;">${p.monthName}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">from <strong>${p.senderName}</strong></p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Your monthly Profit &amp; Loss report is ready. Please review and approve below.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
              <tr><td style="padding:16px 20px;">
                <table width="100%">
                  <tr><td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Revenue</td><td style="font-size:14px;font-weight:700;color:#059669;text-align:right;">${fmtCurrency(p.totalIncome, "USD")}</td></tr>
                  <tr><td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Expenses</td><td style="font-size:14px;font-weight:700;color:#dc2626;text-align:right;">${fmtCurrency(p.totalExpenses, "USD")}</td></tr>
                  <tr>
                    <td style="font-size:13px;font-weight:700;color:#111;border-top:1px solid #e5e7eb;padding-top:8px;">Net Profit</td>
                    <td style="font-size:16px;font-weight:800;color:${netColor};text-align:right;border-top:1px solid #e5e7eb;padding-top:8px;">${netSign}${fmtCurrency(Math.abs(p.netProfit), "USD")}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <a href="${p.approvalUrl}" style="background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              Review &amp; Approve Report
            </a>
            <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Or visit: ${p.approvalUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Sent via <strong style="color:#059669;">Ledgr</strong> · AI-native bookkeeping
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
