import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.categorizationRule.findMany({
    where: { userId: session.user.id as string, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { keyword, category, subcategory } = body as Record<string, string>;
  if (!keyword?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "keyword and category required" }, { status: 400 });
  }

  const rule = await prisma.categorizationRule.create({
    data: {
      userId: session.user.id as string,
      keyword: keyword.trim().toLowerCase(),
      matchType: "CONTAINS",
      category: category.trim(),
      subcategory: subcategory?.trim() || null,
      priority: 50,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const rule = await prisma.categorizationRule.findUnique({ where: { id } });
  if (!rule || rule.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.categorizationRule.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
