import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GoCardless redirects here after the user completes bank auth
// URL: /api/nordigen/callback?ref=ledgr-{userId}-{timestamp}&error=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !ref) {
    return NextResponse.redirect(`${baseUrl}/bank-sync?error=nordigen_cancelled`);
  }

  // ref format: ledgr-{userId}-{timestamp}
  const userId = ref.split("-")[1];
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/bank-sync?error=invalid_ref`);
  }

  // Mark the pending connection as ACTIVE
  await prisma.plaidConnection.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "ACTIVE" },
  });

  return NextResponse.redirect(`${baseUrl}/bank-sync?connected=1`);
}
