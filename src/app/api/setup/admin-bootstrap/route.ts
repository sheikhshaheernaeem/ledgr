import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * One-shot bootstrap for the admin account.
 *
 * Gate: caller must pass `secret` matching env AUTH_SECRET.
 * Behavior:
 *   - If user exists: updates password + ensures role=ADMIN + emailVerified=true.
 *   - If user does not exist: creates them as ADMIN with emailVerified=true.
 *
 * Idempotent. Safe to keep in the codebase since it's gated by AUTH_SECRET which
 * never leaves the server. Useful for resetting an admin after schema migrations
 * or first deploy.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secret, email, password, name } = body as {
    secret?: string; email?: string; password?: string; name?: string;
  };

  const expected = process.env.AUTH_SECRET;
  if (!expected || !secret || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!email?.trim() || !password || password.length < 6) {
    return NextResponse.json({ error: "email and password (min 6 chars) required" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email: email.trim() },
      data: {
        password: hash,
        role: "ADMIN",
        emailVerified: true,
        name: name?.trim() || existing.name,
      },
      select: { id: true, email: true, name: true, role: true, emailVerified: true },
    });
    return NextResponse.json({ action: "updated", user: updated });
  }

  const created = await prisma.user.create({
    data: {
      email: email.trim(),
      name: name?.trim() || "Ledgr Admin",
      password: hash,
      role: "ADMIN",
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, role: true, emailVerified: true },
  });
  return NextResponse.json({ action: "created", user: created });
}
