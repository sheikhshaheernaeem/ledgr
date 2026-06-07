import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.sodRule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, action1, action2, conflictType } = body;

  if (!name || !action1 || !action2) {
    return NextResponse.json({ error: "Name, action1 and action2 are required" }, { status: 400 });
  }

  const rule = await prisma.sodRule.create({
    data: {
      userId: session.user.id,
      name,
      description: description || null,
      action1,
      action2,
      conflictType: conflictType || "SEPARATION_REQUIRED",
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
