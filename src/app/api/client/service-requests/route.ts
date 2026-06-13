import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.clientServiceRequest.findMany({
    where: { clientId: session.user.id as string },
    orderBy: { createdAt: "desc" },
  });

  // Hydrate assignee names
  const assigneeIds = [...new Set(requests.map((r) => r.assignedToId).filter(Boolean) as string[])];
  const assignees = assigneeIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameMap = new Map<string, string>();
  for (const a of assignees) nameMap.set(a.id, a.name ?? a.email);

  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      assignedToName: r.assignedToId ? nameMap.get(r.assignedToId) ?? null : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, description, category, urgency, dueAt } = body as Record<string, string>;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const created = await prisma.clientServiceRequest.create({
    data: {
      clientId: session.user.id as string,
      title: title.trim(),
      description: description?.trim() || null,
      category: category?.trim() || "OTHER",
      urgency: urgency?.trim() || "MED",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
