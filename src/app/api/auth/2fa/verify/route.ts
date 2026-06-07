import { NextResponse } from "next/server";
import { verify as totpVerify } from "otplib";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateBackupCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  return Array.from({ length: 8 }, (_, i) => chars[bytes[i] % chars.length]).join("");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id as string;
    const { code, secret: bodySecret } = await req.json() as { code?: string; secret?: string };
    const token = code ?? "";

    if (!token) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
    const secret = bodySecret ?? user?.twoFactorSecret ?? "";
    if (!secret) return NextResponse.json({ error: "2FA setup not started" }, { status: 400 });

    const result = await totpVerify({ token: token.trim(), secret });
    if (!result.valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const plaintextCodes = Array.from({ length: 10 }, generateBackupCode);
    const { createHash } = await import("crypto");
    const hashedCodes = plaintextCodes.map(c => createHash("sha256").update(c).digest("hex"));

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: JSON.stringify(hashedCodes) },
    });

    return NextResponse.json({ backupCodes: plaintextCodes });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
