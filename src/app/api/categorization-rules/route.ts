import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const rules = await prisma.categorizationRule.findMany({
    where: { userId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { keyword, matchType, category, subcategory, taxCategory, priority } = body as {
    keyword: string;
    matchType: string;
    category: string;
    subcategory?: string | null;
    taxCategory?: string | null;
    priority?: number;
  };

  if (!keyword || !matchType || !category) {
    return NextResponse.json({ error: "keyword, matchType, and category are required" }, { status: 400 });
  }

  if (!["CONTAINS", "STARTS_WITH", "EXACT"].includes(matchType)) {
    return NextResponse.json({ error: "matchType must be CONTAINS, STARTS_WITH, or EXACT" }, { status: 400 });
  }

  const rule = await prisma.categorizationRule.create({
    data: {
      userId,
      keyword,
      matchType,
      category,
      subcategory: subcategory ?? null,
      taxCategory: taxCategory ?? null,
      priority: priority ?? 0,
      isActive: true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
