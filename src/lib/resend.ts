import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(params: {
  toEmail: string;
  toName: string;
  verifyUrl: string;
}) {
  const isDemoMode = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "demo-mode";

  if (isDemoMode) {
    console.log(`[DEV] Verification link for ${params.toEmail}: ${params.verifyUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@ledgr.app",
    to: params.toEmail,
    subject: "Confirm your Ledgr account",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #111; border: 1px solid #222; border-radius: 14px; padding: 40px 36px; }
    .logo { font-size: 22px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; margin-bottom: 28px; }
    h1 { font-size: 22px; font-weight: 600; color: #fff; margin: 0 0 10px; }
    p { color: #aaa; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: inline-block; background: #10b981; color: #000 !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
    .note { font-size: 12px; color: #555; margin-top: 28px; border-top: 1px solid #1e1e1e; padding-top: 20px; }
    .url { word-break: break-all; color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Ledgr</div>
      <h1>Confirm your email address</h1>
      <p>Hi ${params.toName}, welcome to Ledgr! Click the button below to verify your email and activate your account.</p>
      <a href="${params.verifyUrl}" class="btn">Verify Email →</a>
      <div class="note">
        <p style="margin:0 0 8px">This link expires in 24 hours. If you didn't create a Ledgr account, you can safely ignore this email.</p>
        <p class="url">Or copy this link: ${params.verifyUrl}</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  });

  if (error) throw new Error(error.message);
}

interface SendReportEmailParams {
  toEmail: string;
  toName: string;
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  narrative: string;
  reportUrl: string;
}

export async function sendMonthlyReport(params: SendReportEmailParams) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "reports@ledgr.app",
    to: params.toEmail,
    subject: `Your ${params.month} ${params.year} Bookkeeping Report is Ready`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; padding: 0 20px; }
    .header { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 600; color: #fff; margin: 0 0 8px; }
    .subtitle { color: #888; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; text-align: center; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 6px; }
    .stat-value { font-size: 22px; font-weight: 700; }
    .income { color: #10b981; }
    .expense { color: #ef4444; }
    .profit { color: ${params.netProfit >= 0 ? "#10b981" : "#ef4444"}; }
    .narrative { background: #111; border: 1px solid #222; border-left: 3px solid #10b981; border-radius: 10px; padding: 20px; margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: #ccc; }
    .cta { text-align: center; margin-bottom: 32px; }
    .btn { display: inline-block; background: #10b981; color: #000; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
    .footer { text-align: center; color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ledgr</div>
      <h1>Your ${params.month} ${params.year} Report</h1>
      <p class="subtitle">Here's your monthly financial summary, reviewed by our team.</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Total Income</div>
        <div class="stat-value income">$${params.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Expenses</div>
        <div class="stat-value expense">$${params.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Net Profit</div>
        <div class="stat-value profit">${params.netProfit >= 0 ? "+" : ""}$${Math.abs(params.netProfit).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
      </div>
    </div>

    <div class="narrative">${params.narrative}</div>

    <div class="cta">
      <a href="${params.reportUrl}" class="btn">View Full Report →</a>
    </div>

    <div class="footer">
      <p>Ledgr · AI Bookkeeping for Small Businesses<br>
      Questions? Reply to this email — we respond within 24 hours.</p>
    </div>
  </div>
</body>
</html>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}
