import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const { id } = await params;

  const flag = await prisma.anomalyFlag.findUnique({ where: { id } });
  if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let allowed = flag.userId === sessionUserId || role === "ADMIN";
  if (!allowed && role === "ACCOUNTANT") {
    const mc = await prisma.managedClient.findUnique({
      where: { accountantId_clientId: { accountantId: sessionUserId, clientId: flag.userId } },
    });
    allowed = mc?.isActive === true;
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.anomalyFlag.update({
    where: { id },
    data: { dismissed: true, resolvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
