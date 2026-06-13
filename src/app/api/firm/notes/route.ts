import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function operatorGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id as string, role };
}

export async function GET(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const notes = await prisma.firmNote.findMany({
    where: { clientId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const g = await operatorGate();
  if ("error" in g) return g.error;

  const body = await req.json();
  const { clientId, body: noteBody, pinned } = body as {
    clientId: string; body: string; pinned?: boolean;
  };

  if (!clientId?.trim() || !noteBody?.trim()) {
    return NextResponse.json({ error: "clientId and body required" }, { status: 400 });
  }

  const note = await prisma.firmNote.create({
    data: {
      authorId: g.userId,
      clientId: clientId.trim(),
      body: noteBody.trim(),
      pinned: !!pinned,
    },
  });
  return NextResponse.json(note, { status: 201 });
}
