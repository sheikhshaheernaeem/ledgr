import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public route - no auth required
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.vendorPortalInvite.findUnique({
    where: { token },
    include: { user: { select: { companyName: true, companyLogo: true, email: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    if (invite.status !== "EXPIRED") {
      await prisma.vendorPortalInvite.update({ where: { token }, data: { status: "EXPIRED" } });
    }
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  return NextResponse.json({
    vendorName: invite.vendorName,
    vendorEmail: invite.vendorEmail,
    status: invite.status,
    company: {
      name: invite.user.companyName,
      logo: invite.user.companyLogo,
    },
    expiresAt: invite.expiresAt,
  });
}
