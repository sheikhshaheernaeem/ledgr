import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mailer";
import { getTier } from "@/config/tiers";

const VALID_PLANS = [
  "starter", "growth", "cfo",
  "ai-starter", "ai-growth", "ai-cfo",
] as const;

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  plan: z.string().optional(),
  role: z.enum(["CLIENT", "ACCOUNTANT"]).optional(),
});

function getAppUrl(req: Request): string {
  const host = req.headers.get("host") ?? "localhost:3001";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, email, password, plan, role } = parsed.data;
    // Map plan slug → subscription status (uppercase with AI_ prefix for AI tier)
    const subscriptionStatus = VALID_PLANS.includes(plan as typeof VALID_PLANS[number])
      ? plan!.replace("-", "_").toUpperCase()
      : "STARTER";
    const family = getTier(subscriptionStatus).family;

    // Public registration: CLIENT or ACCOUNTANT (admins provisioned separately).
    const finalRole = role === "ACCOUNTANT" ? "ACCOUNTANT" : "CLIENT";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // One Ledgr login can hold both products. If this is the same person
      // adding the *other* family to their existing CLIENT account, verify
      // their password and attach the plan instead of blocking them.
      const canLink = finalRole === "CLIENT" && existing.role === "CLIENT" && !!existing.password
        && (await bcrypt.compare(password, existing.password));

      if (!canLink) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      await prisma.subscription.upsert({
        where: { userId_family: { userId: existing.id, family } },
        create: { userId: existing.id, family, plan: subscriptionStatus, status: "ACTIVE" },
        update: { plan: subscriptionStatus, status: "ACTIVE" },
      });

      return NextResponse.json({ linked: true, email: existing.email }, { status: 200 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name, email, password: hashed, emailVerified: false,
        subscriptionStatus,
        role: finalRole,
        subscriptions: { create: { family, plan: subscriptionStatus, status: "ACTIVE" } },
      },
    });

    // Create verification token (expires in 24h)
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${getAppUrl(req)}/verify-email?token=${token}`;

    try {
      await sendVerificationEmail({ toEmail: email, toName: name, verifyUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[email:verification] FAILED to=${email} err="${msg}"`);
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
