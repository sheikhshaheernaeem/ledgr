import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const transactionId = searchParams.get("transactionId");
  const reportId = searchParams.get("reportId");
  const userId = searchParams.get("userId"); // accountant viewing a client's thread

  if (!transactionId && !reportId && !userId) {
    return NextResponse.json(
      { error: "transactionId, reportId, or userId is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = {};
  if (transactionId) where.transactionId = transactionId;
  if (reportId) where.reportId = reportId;
  if (userId) where.userId = userId;

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  // Mark messages as read where the viewer is the inbox owner (CLIENT) and message role is ACCOUNTANT,
  // or vice versa
  const sessionUserId = session.user!.id;
  const unreadIds = messages
    .filter((m) => {
      if (m.readAt) return false;
      // mark read if viewer is the message's intended recipient
      const sessionRole = (session.user as { role?: string }).role;
      if (sessionRole === "CLIENT" && m.role === "ACCOUNTANT") return true;
      if ((sessionRole === "ACCOUNTANT" || sessionRole === "ADMIN" || sessionRole === "QA") && m.role === "CLIENT") return true;
      return m.userId !== sessionUserId;
    })
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionUserId = session.user.id as string;
  const sessionRole = (session.user as { role?: string }).role;

  const body = await request.json();
  const { transactionId, reportId, body: messageBody, userId: targetUserId, role: explicitRole } = body as {
    transactionId?: string;
    reportId?: string;
    body: string;
    userId?: string; // when accountant addresses a client
    role?: string;   // override (must match sessionRole or fall back to it)
  };

  if (!messageBody?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  // Resolve the inbox owner. CLIENT users post to their own inbox; accountants post to a client's inbox.
  let inboxUserId = sessionUserId;
  if (targetUserId && targetUserId !== sessionUserId) {
    if (sessionRole !== "ACCOUNTANT" && sessionRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (sessionRole === "ACCOUNTANT") {
      const mc = await prisma.managedClient.findUnique({
        where: { accountantId_clientId: { accountantId: sessionUserId, clientId: targetUserId } },
      });
      if (!mc?.isActive) return NextResponse.json({ error: "Not your client" }, { status: 403 });
    }
    inboxUserId = targetUserId;
  }

  if (!transactionId && !reportId && inboxUserId === sessionUserId) {
    // For client direct notes, allow general (no entity required) — fall through.
  }

  const message = await prisma.message.create({
    data: {
      userId: inboxUserId,
      transactionId: transactionId ?? undefined,
      reportId: reportId ?? undefined,
      body: messageBody.trim(),
      role: (explicitRole as string) || sessionRole || "CLIENT",
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
