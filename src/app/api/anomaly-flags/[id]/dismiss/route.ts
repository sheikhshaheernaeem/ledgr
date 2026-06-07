import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const flag = await prisma.anomalyFlag.findFirst({ where: { id, userId: session.user.id } });
  if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.anomalyFlag.update({
    where: { id },
    data: { dismissed: true, resolvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
