import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;

  const body = await request.json();
  const { apiKey, apiSecret, config } = body;

  // In production, encrypt credentials before storing
  const credentials = JSON.stringify({ apiKey: apiKey || "", apiSecret: apiSecret || "" });

  const integration = await prisma.integrationConfig.upsert({
    where: { userId_provider: { userId: session.user.id, provider: provider.toUpperCase() } },
    create: {
      userId: session.user.id,
      provider: provider.toUpperCase(),
      status: "ACTIVE",
      credentials,
      config: config ? JSON.stringify(config) : null,
    },
    update: {
      status: "ACTIVE",
      credentials,
      config: config ? JSON.stringify(config) : undefined,
    },
  });

  return NextResponse.json({ success: true, integration: { id: integration.id, provider: integration.provider, status: integration.status } });
}
