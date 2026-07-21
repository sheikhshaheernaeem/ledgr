import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { name, email, password, role, companyName, subscriptionStatus } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    companyName?: string;
    subscriptionStatus?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const ALLOWED_ROLES = ["ADMIN", "ACCOUNTANT", "CLIENT", "QA"] as const;
  if (!role || !ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
    return NextResponse.json({ error: "Role must be ADMIN, ACCOUNTANT, CLIENT, or QA" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: role as "ADMIN" | "ACCOUNTANT" | "CLIENT" | "QA",
      emailVerified: true,
      ...(companyName?.trim() ? { companyName: companyName.trim() } : {}),
      ...(subscriptionStatus?.trim() ? { subscriptionStatus: subscriptionStatus.trim().toUpperCase() } : {}),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, companyName: true },
  });

  return NextResponse.json(user, { status: 201 });
}
