import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const NORDIGEN_BASE = "https://bankaccountdata.gocardless.com/api/v2";

async function getNordigenToken(): Promise<string | null> {
  const id = process.env.NORDIGEN_SECRET_ID;
  const key = process.env.NORDIGEN_SECRET_KEY;
  if (!id || !key) return null;

  const res = await fetch(`${NORDIGEN_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ secret_id: id, secret_key: key }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access as string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { institutionId, country } = body as { institutionId: string; country: string };

  const token = await getNordigenToken();
  if (!token) {
    return NextResponse.json({ demo: true, message: "Set NORDIGEN_SECRET_ID + NORDIGEN_SECRET_KEY to enable EU bank connections." });
  }

  // Create an end-user agreement (90 days, 90-day history)
  const agreementRes = await fetch(`${NORDIGEN_BASE}/agreements/enduser/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ["balances", "details", "transactions"],
    }),
  });
  if (!agreementRes.ok) {
    return NextResponse.json({ error: "Failed to create bank agreement" }, { status: 502 });
  }
  const agreement = await agreementRes.json();

  // Create a requisition (redirect flow)
  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const requisitionRes = await fetch(`${NORDIGEN_BASE}/requisitions/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      redirect: `${origin}/api/nordigen/callback`,
      institution_id: institutionId,
      agreement: agreement.id,
      reference: `ledgr-${session.user.id}-${Date.now()}`,
      user_language: "EN",
    }),
  });
  if (!requisitionRes.ok) {
    return NextResponse.json({ error: "Failed to create requisition" }, { status: 502 });
  }
  const requisition = await requisitionRes.json();

  // Store requisition id so callback can retrieve accounts
  await prisma.plaidConnection.create({
    data: {
      userId: session.user.id as string,
      accessToken: requisition.id, // repurpose field to store Nordigen requisition id
      itemId: agreement.id,
      institutionId,
      institutionName: `${country}-${institutionId}`,
      status: "PENDING",
    },
  });

  return NextResponse.json({ link: requisition.link, requisitionId: requisition.id });
}
