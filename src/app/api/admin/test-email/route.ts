import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const recipientOverride = (body as { to?: string }).to;

  const gmailUser = process.env.GMAIL_USER ?? "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";

  const provider = gmailUser && gmailPass ? "gmail"
    : resendKey ? "resend"
    : "none";

  const diagnostics = {
    provider,
    GMAIL_USER_SET: !!gmailUser,
    GMAIL_USER_VALUE: gmailUser ? `${gmailUser.slice(0, 4)}***@gmail.com` : "(not set)",
    GMAIL_PASS_SET: !!gmailPass,
    GMAIL_PASS_LENGTH: gmailPass.length,
    RESEND_SET: !!resendKey,
  };

  if (provider === "none") {
    return NextResponse.json({ error: "No email provider configured", diagnostics }, { status: 500 });
  }

  const to = recipientOverride ?? session.user.email ?? "admin@ledgr.app";

  if (provider === "gmail") {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false },
      });

      // Verify SMTP connection first
      await transporter.verify();

      await transporter.sendMail({
        from: `"Ledgr" <${gmailUser}>`,
        to,
        subject: "Ledgr — Email test ✓",
        html: `<p style="font-family:sans-serif">This is a test email from <b>Ledgr</b> sent at ${new Date().toISOString()} via Gmail SMTP.</p><p>Email is working correctly ✓</p>`,
      });

      return NextResponse.json({ ok: true, sentTo: to, provider: "gmail", diagnostics });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[test-email] Gmail SMTP error: ${msg}`);
      return NextResponse.json({ error: msg, diagnostics }, { status: 500 });
    }
  }

  // Resend fallback
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: "Ledgr <onboarding@resend.dev>",
      to,
      subject: "Ledgr — Email test ✓",
      html: `<p>Test email from Ledgr at ${new Date().toISOString()} via Resend.</p>`,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, sentTo: to, provider: "resend", diagnostics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, diagnostics }, { status: 500 });
  }
}

// GET — returns diagnostic info without sending
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gmailUser = process.env.GMAIL_USER ?? "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";

  return NextResponse.json({
    provider: gmailUser && gmailPass ? "gmail" : resendKey ? "resend" : "none",
    GMAIL_USER_SET: !!gmailUser,
    GMAIL_USER_VALUE: gmailUser ? `${gmailUser.slice(0, 4)}***` : "(not set)",
    GMAIL_PASS_SET: !!gmailPass,
    GMAIL_PASS_LENGTH: gmailPass.length,
    RESEND_SET: !!resendKey,
    expectedProvider: "gmail (ledgr.notification@gmail.com)",
  });
}
