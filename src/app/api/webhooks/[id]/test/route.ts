import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const hook = await prisma.webhook.findFirst({ where: { id, userId: session.user.id } });
  if (!hook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dispatchWebhook(session.user.id, "webhook.test", {
    message: "This is a test event from Ledgr",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
