import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface DocReqItem {
  label: string;
  status: "pending" | "submitted" | "approved";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const userId = session.user.id as string;

  const { id } = await params;
  const existing = await prisma.documentRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization
  const isClient = role === "CLIENT" && existing.clientId === userId;
  const isOperator = (role === "ACCOUNTANT" || role === "ADMIN") && (existing.requesterId === userId || role === "ADMIN");
  if (!isClient && !isOperator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.itemIndex !== undefined && body.itemStatus) {
    const items: DocReqItem[] = JSON.parse(existing.itemsJson);
    if (items[body.itemIndex]) {
      items[body.itemIndex].status = body.itemStatus;
      data.itemsJson = JSON.stringify(items);
      // Auto-update parent status
      const allApproved = items.every((it) => it.status === "approved");
      const anySubmitted = items.some((it) => it.status === "submitted" || it.status === "approved");
      data.status = allApproved ? "COMPLETE" : anySubmitted ? "PARTIAL" : "OPEN";
      if (allApproved) data.completedAt = new Date();
    }
  }

  if (isOperator) {
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  }

  const updated = await prisma.documentRequest.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const userId = session.user.id as string;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.documentRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.requesterId !== userId && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.documentRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
