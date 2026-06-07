import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id as string;
    const userEmail = session.user.email as string;

    const secret = generateSecret();
    const uri = generateURI({ label: userEmail, issuer: "Ledgr", secret });
    const qrCode = await QRCode.toDataURL(uri);

    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    return NextResponse.json({ secret, qrCode });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
