import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { vendorName, vendorEmail } = body;

  if (!vendorName || !vendorEmail) {
    return NextResponse.json({ error: "Vendor name and email are required" }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const invite = await prisma.vendorPortalInvite.create({
    data: {
      userId: session.user.id,
      vendorName,
      vendorEmail,
      token,
      expiresAt,
    },
  });

  const portalUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/p/vendor/${token}`;

  return NextResponse.json({ ...invite, portalUrl }, { status: 201 });
}
