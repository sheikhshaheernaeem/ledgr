import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

/**
 * Bench refugee lead capture.
 * Stores the lead, notifies the team via email, and replies to the lead.
 *
 * No auth required — public endpoint with basic rate-limit by IP.
 */
const RATE_LIMIT = new Map<string, number[]>();

function rateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (RATE_LIMIT.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  RATE_LIMIT.set(ip, hits);
  return hits.length <= max;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, email, companyName, lastBenchMonth, avgMonthlyTransactions, notes } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://ledgr-beryl.vercel.app";
  const teamEmail = process.env.LEDGR_TEAM_EMAIL ?? process.env.NEXT_PUBLIC_FOUNDER_EMAIL ?? "m.shaheernaeem@gmail.com";

  // Notify the team
  sendEmail({
    to: teamEmail,
    subject: `🚨 Bench refugee lead: ${companyName || name}`,
    html: `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;">
        <p style="font-family:monospace;font-size:11px;color:#10b981;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px">ledgr / new lead</p>
        <h2 style="margin:0 0 16px;font-size:18px">New Bench migration request</h2>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#9ca3af;width:160px">name</td><td style="padding:6px 0;color:#e6edf3">${esc(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#9ca3af">email</td><td style="padding:6px 0;color:#10b981;font-family:monospace"><a href="mailto:${esc(email)}" style="color:#10b981;text-decoration:none">${esc(email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#9ca3af">company</td><td style="padding:6px 0;color:#e6edf3">${esc(companyName || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#9ca3af">last_bench_month</td><td style="padding:6px 0;color:#e6edf3">${esc(lastBenchMonth || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#9ca3af">avg_monthly_txns</td><td style="padding:6px 0;color:#e6edf3">${esc(avgMonthlyTransactions || "—")}</td></tr>
        </table>
        ${notes ? `<div style="margin-top:16px;padding:12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;font-size:13px;line-height:1.5;color:#cbd5e1">${esc(notes)}</div>` : ""}
        <p style="margin-top:24px;font-size:12px;color:#6b7280">Reply within 2 hours. They're expecting it.</p>
      </div>
    </body></html>`,
  }).catch((e) => console.error("[bench-migration] team email failed:", e));

  // Reply to lead
  sendEmail({
    to: email.trim(),
    subject: `We got your Bench migration request — here's what's next`,
    html: `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,sans-serif;background:#fff;color:#111827;padding:24px;">
      <div style="max-width:560px;margin:0 auto;">
        <p style="font-family:monospace;font-size:11px;color:#059669;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px">ledgr / received</p>
        <h2 style="margin:0 0 12px;font-size:22px">Hi ${esc(name.split(" ")[0])},</h2>
        <p style="line-height:1.6;color:#374151;font-size:15px">Thanks for reaching out. We're built for exactly your situation — Bench refugees who need real bookkeeping, not another SaaS tool.</p>
        <p style="line-height:1.6;color:#374151;font-size:15px"><strong>What happens next:</strong></p>
        <ol style="line-height:1.7;color:#374151;font-size:15px;padding-left:20px">
          <li>Within 2 hours: a real human from our team replies with a migration plan tailored to your setup.</li>
          <li>You upload your last Bench CSV (or your bank's CSV — same data).</li>
          <li>By tomorrow: your first reviewed P&amp;L is in your inbox.</li>
        </ol>
        <p style="line-height:1.6;color:#374151;font-size:15px;margin-top:16px">Want to skip the queue and start now? Sign up directly — first month is free for Bench refugees:</p>
        <p style="margin:24px 0;text-align:center">
          <a href="${appUrl}/register?plan=growth&source=bench" style="display:inline-block;background:#059669;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px">Start now →</a>
        </p>
        <p style="line-height:1.6;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px">Questions before we talk? Reply directly to this email.<br/>— The Ledgr team</p>
      </div>
    </body></html>`,
  }).catch((e) => console.error("[bench-migration] lead email failed:", e));

  return NextResponse.json({ success: true });
}

function esc(s: string): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
