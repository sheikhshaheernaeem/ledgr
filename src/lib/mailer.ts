import nodemailer from "nodemailer";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (isDemoMode()) {
    console.log(`[DEV] Email to ${params.to}: ${params.subject}`);
    return;
  }
  const transporter = createTransport()!;
  await transporter.sendMail({
    from: params.from ?? `"Ledgr" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function isDemoMode() {
  return !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD;
}

const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; padding: 0 20px; }
  .card { background: #111; border: 1px solid #222; border-radius: 14px; padding: 40px 36px; }
  .logo { font-size: 22px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; margin-bottom: 28px; }
  h1 { font-size: 22px; font-weight: 600; color: #fff; margin: 0 0 10px; }
  p { color: #aaa; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
  .btn { display: inline-block; background: #10b981; color: #000 !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
  .note { font-size: 12px; color: #555; margin-top: 28px; border-top: 1px solid #1e1e1e; padding-top: 20px; }
  .url { word-break: break-all; color: #555; font-size: 12px; }
`;

export async function sendVerificationEmail(params: {
  toEmail: string;
  toName: string;
  verifyUrl: string;
}) {
  if (isDemoMode()) {
    console.log(`[DEV] Verify email for ${params.toEmail}: ${params.verifyUrl}`);
    return;
  }

  const transporter = createTransport()!;
  await transporter.sendMail({
    from: `"Ledgr" <${process.env.GMAIL_USER}>`,
    to: params.toEmail,
    subject: "Confirm your Ledgr account",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body><div class="container"><div class="card">
  <div class="logo">Ledgr</div>
  <h1>Confirm your email address</h1>
  <p>Hi ${params.toName}, welcome to Ledgr! Click the button below to verify your email and activate your account.</p>
  <a href="${params.verifyUrl}" class="btn">Verify Email →</a>
  <div class="note">
    <p style="margin:0 0 8px">This link expires in 24 hours. If you didn't create a Ledgr account, you can safely ignore this email.</p>
    <p class="url">Or copy this link: ${params.verifyUrl}</p>
  </div>
</div></div></body></html>`,
  });
}

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  toName: string;
  resetUrl: string;
}) {
  if (isDemoMode()) {
    console.log(`[DEV] Reset password for ${params.toEmail}: ${params.resetUrl}`);
    return;
  }

  const transporter = createTransport()!;
  await transporter.sendMail({
    from: `"Ledgr" <${process.env.GMAIL_USER}>`,
    to: params.toEmail,
    subject: "Reset your Ledgr password",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body><div class="container"><div class="card">
  <div class="logo">Ledgr</div>
  <h1>Reset your password</h1>
  <p>Hi ${params.toName}, we received a request to reset your Ledgr password. Click the button below to choose a new password.</p>
  <a href="${params.resetUrl}" class="btn">Reset Password →</a>
  <div class="note">
    <p style="margin:0 0 8px">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
    <p class="url">Or copy this link: ${params.resetUrl}</p>
  </div>
</div></div></body></html>`,
  });
}

export async function sendMonthlyReport(params: {
  toEmail: string;
  toName: string;
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  narrative: string;
  reportUrl: string;
}) {
  if (isDemoMode()) {
    console.log(`[DEV] Monthly report email to ${params.toEmail}`);
    return;
  }

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const profitColor = params.netProfit >= 0 ? "#10b981" : "#ef4444";
  const transporter = createTransport()!;
  await transporter.sendMail({
    from: `"Ledgr Reports" <${process.env.GMAIL_USER}>`,
    to: params.toEmail,
    subject: `Your ${params.month} ${params.year} Bookkeeping Report is Ready`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; padding: 0 20px; }
  .header { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
  .logo { font-size: 20px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; margin-bottom: 16px; }
  h1 { font-size: 24px; font-weight: 600; color: #fff; margin: 0 0 8px; }
  .subtitle { color: #888; font-size: 14px; }
  .stats { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { flex: 1; background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; text-align: center; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .narrative { background: #111; border: 1px solid #222; border-left: 3px solid #10b981; border-radius: 10px; padding: 20px; margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: #ccc; }
  .cta { text-align: center; margin-bottom: 32px; }
  .btn { display: inline-block; background: #10b981; color: #000; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
  .footer { text-align: center; color: #555; font-size: 12px; }
</style>
</head>
<body><div class="container">
  <div class="header">
    <div class="logo">Ledgr</div>
    <h1>Your ${params.month} ${params.year} Report</h1>
    <p class="subtitle">Here's your monthly financial summary.</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Income</div><div class="stat-value" style="color:#10b981">${fmt(params.totalIncome)}</div></div>
    <div class="stat"><div class="stat-label">Total Expenses</div><div class="stat-value" style="color:#ef4444">${fmt(params.totalExpenses)}</div></div>
    <div class="stat"><div class="stat-label">Net Profit</div><div class="stat-value" style="color:${profitColor}">${params.netProfit >= 0 ? "+" : ""}${fmt(params.netProfit)}</div></div>
  </div>
  <div class="narrative">${params.narrative}</div>
  <div class="cta"><a href="${params.reportUrl}" class="btn">View Full Report →</a></div>
  <div class="footer"><p>Ledgr · AI Bookkeeping for Small Businesses<br>Questions? Reply to this email.</p></div>
</div></body></html>`,
  });
}
