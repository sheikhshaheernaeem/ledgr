import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;

  const integration = await prisma.integrationConfig.findFirst({
    where: { userId: session.user.id, provider: provider.toUpperCase() },
  });

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  await prisma.integrationConfig.update({
    where: { id: integration.id },
    data: { status: "INACTIVE", credentials: null },
  });

  return NextResponse.json({ success: true });
}
