import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));
  }

  const record = await prisma.emailVerification.findUnique({ where: { token } });

  if (!record) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { token } });
    return NextResponse.redirect(new URL("/verify-email?error=expired", req.url));
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });

  await prisma.emailVerification.delete({ where: { token } });

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
