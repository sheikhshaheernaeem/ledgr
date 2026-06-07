import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys.map(k => ({ ...k, scopes: tryParseJson(k.scopes, ["read"]) })));
}

function tryParseJson(str: string, fallback: string[]): string[] {
  try { return JSON.parse(str) as string[]; } catch { return fallback; }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, scopes, expiresAt } = await req.json() as { name: string; scopes?: string[]; expiresAt?: string };
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const rawKey = `lk_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.slice(0, 10);

  const key = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash: hash,
      prefix,
      scopes: JSON.stringify(scopes ?? ["read"]),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ id: key.id, name: key.name, prefix: key.prefix, key: rawKey });
}
