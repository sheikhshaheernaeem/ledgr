import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PLAID_BASE = `https://${process.env.PLAID_ENV ?? "sandbox"}.plaid.com`;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  // Demo mode — no real credentials configured
  if (!clientId || !secret) {
    return NextResponse.json({
      linkToken: "demo-link-token",
      demo: true,
    });
  }

  // Real Plaid — create a Link token
  const res = await fetch(`${PLAID_BASE}/link/token/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      user: { client_user_id: session.user.id },
      client_name: "Ledgr",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Plaid link/token/create error:", err);
    return NextResponse.json(
      { error: "Failed to create Plaid link token" },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json({ linkToken: data.link_token, demo: false });
}
