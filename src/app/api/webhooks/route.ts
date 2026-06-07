import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function tryParseJson(str: string, fallback: string[]): string[] {
  try { return JSON.parse(str) as string[]; } catch { return fallback; }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hooks = await prisma.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hooks.map(h => ({ ...h, events: tryParseJson(h.events, []) })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { url, events, description } = await req.json() as { url: string; events: string[]; description?: string };
  if (!url || !events?.length) return NextResponse.json({ error: "url and events required" }, { status: 400 });

  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  const hook = await prisma.webhook.create({
    data: { userId: session.user.id, url, events: JSON.stringify(events), secret, description: description ?? null },
  });
  return NextResponse.json({ ...hook, events, secretRevealed: secret });
}
