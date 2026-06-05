import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");

  const where: Record<string, unknown> = { userId };
  if (reportId) where.reportId = reportId;

  const workpapers = await prisma.workpaper.findMany({
    where,
    include: {
      _count: { select: { items: true } },
      items: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = workpapers.map((wp) => ({
    ...wp,
    totalItems: wp._count.items,
    tickedItems: wp.items.filter((i) => i.status === "TICKED").length,
    items: undefined,
    _count: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { name, description, reportId, dueDate, assignedTo, items } = body as {
    name: string;
    description?: string;
    reportId?: string;
    dueDate?: string;
    assignedTo?: string;
    items?: Array<{ description: string; reference?: string; notes?: string }>;
  };

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const workpaper = await prisma.workpaper.create({
    data: {
      userId,
      name,
      description: description ?? null,
      reportId: reportId ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo ?? null,
      items: items && items.length > 0
        ? {
            create: items.map((item) => ({
              description: item.description,
              reference: item.reference ?? null,
              notes: item.notes ?? null,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json(workpaper, { status: 201 });
}
