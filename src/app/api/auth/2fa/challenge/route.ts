import { NextResponse } from "next/server";
import { verify as totpVerify } from "otplib";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id as string;
    const { code } = await req.json() as { code?: string };
    const token = code ?? "";
    if (!token) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
    }

    const trimmedToken = token.trim().toUpperCase();
    let verified = false;

    const result = await totpVerify({ token: trimmedToken, secret: user.twoFactorSecret }).catch(() => ({ valid: false }));
    verified = result.valid;

    if (!verified && user.twoFactorBackupCodes) {
      const { createHash } = await import("crypto");
      const storedHashes: string[] = JSON.parse(user.twoFactorBackupCodes) as string[];
      const incomingHash = createHash("sha256").update(trimmedToken).digest("hex");
      const matchedIndex = storedHashes.findIndex(h => h === incomingHash);
      if (matchedIndex !== -1) {
        const remaining = storedHashes.filter((_, i) => i !== matchedIndex);
        await prisma.user.update({ where: { id: userId }, data: { twoFactorBackupCodes: JSON.stringify(remaining) } });
        verified = true;
      }
    }

    if (!verified) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId, token: `2FA_VERIFIED_${verificationToken}`, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });

    return NextResponse.json({ ok: true, verificationToken });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
