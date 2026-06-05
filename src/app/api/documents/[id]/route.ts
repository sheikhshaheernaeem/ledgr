import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, content, status, notes, clientId, signedAt } = body;

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(signedAt !== undefined && { signedAt: signedAt ? new Date(signedAt) : null }),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
