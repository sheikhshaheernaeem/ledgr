import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  try {
    await sendEmail({
      to: session.user.email ?? "admin@ledgr.app",
      subject: "Ledgr — Email test ✓",
      html: `<p>This is a test email from Ledgr sent at ${new Date().toISOString()}. If you received this, email is working correctly.</p>`,
    });
    return NextResponse.json({ ok: true, sentTo: session.user.email ?? "unknown" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
