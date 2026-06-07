import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { id } = await params;

  const rule = await prisma.categorizationRule.findFirst({ where: { id, userId } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { isActive, keyword, matchType, category, subcategory, taxCategory, priority } = body as {
    isActive?: boolean;
    keyword?: string;
    matchType?: string;
    category?: string;
    subcategory?: string | null;
    taxCategory?: string | null;
    priority?: number;
  };

  const updated = await prisma.categorizationRule.update({
    where: { id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(keyword !== undefined && { keyword }),
      ...(matchType !== undefined && { matchType }),
      ...(category !== undefined && { category }),
      ...(subcategory !== undefined && { subcategory }),
      ...(taxCategory !== undefined && { taxCategory }),
      ...(priority !== undefined && { priority }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { id } = await params;

  const rule = await prisma.categorizationRule.findFirst({ where: { id, userId } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.categorizationRule.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
