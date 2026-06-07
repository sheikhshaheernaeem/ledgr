import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.whiteLabelConfig.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(config || { userId: session.user.id, primaryColor: "#0f172a", accentColor: "#3b82f6" });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { brandName, brandLogo, primaryColor, accentColor, customDomain, supportEmail, footerText, hideVercel } = body;

  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      brandName: brandName || null,
      brandLogo: brandLogo || null,
      primaryColor: primaryColor || "#0f172a",
      accentColor: accentColor || "#3b82f6",
      customDomain: customDomain || null,
      supportEmail: supportEmail || null,
      footerText: footerText || null,
      hideVercel: hideVercel || false,
    },
    update: {
      brandName: brandName !== undefined ? brandName : undefined,
      brandLogo: brandLogo !== undefined ? brandLogo : undefined,
      primaryColor: primaryColor !== undefined ? primaryColor : undefined,
      accentColor: accentColor !== undefined ? accentColor : undefined,
      customDomain: customDomain !== undefined ? customDomain : undefined,
      supportEmail: supportEmail !== undefined ? supportEmail : undefined,
      footerText: footerText !== undefined ? footerText : undefined,
      hideVercel: hideVercel !== undefined ? hideVercel : undefined,
    },
  });

  return NextResponse.json(config);
}
