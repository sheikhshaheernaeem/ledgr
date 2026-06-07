import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const members = await prisma.teamMember.findMany({
    where: { ownerId: session.user.id, isActive: true },
    include: { member: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memberId, role } = await req.json() as { memberId: string; role?: string };
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  if (memberId === session.user.id) return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  const member = await prisma.teamMember.create({
    data: { ownerId: session.user.id, memberId, role: role ?? "VIEWER" },
    include: { member: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(member);
}
