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

  if (!transactionId && !reportId) {
    return NextResponse.json(
      { error: "transactionId or reportId is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = {};
  if (transactionId) where.transactionId = transactionId;
  if (reportId) where.reportId = reportId;

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  // Mark messages as read where they were not sent by the current user
  const unreadIds = messages
    .filter((m) => m.userId !== session.user!.id && m.readAt === null)
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

  const body = await request.json();
  const { transactionId, reportId, body: messageBody } = body as {
    transactionId?: string;
    reportId?: string;
    body: string;
  };

  if (!messageBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  if (!transactionId && !reportId) {
    return NextResponse.json(
      { error: "transactionId or reportId is required" },
      { status: 400 }
    );
  }

  // Get user's role for the message role field
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id },
    select: { role: true },
  });

  const message = await prisma.message.create({
    data: {
      userId: session.user!.id,
      transactionId: transactionId ?? undefined,
      reportId: reportId ?? undefined,
      body: messageBody,
      role: user?.role ?? "CLIENT",
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
