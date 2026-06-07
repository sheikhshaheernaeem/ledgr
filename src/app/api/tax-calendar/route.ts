import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.taxCalendarEvent.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, dueDate, type, status, amount, notes } = body as {
    title: string;
    description?: string;
    dueDate: string;
    type?: string;
    status?: string;
    amount?: number;
    notes?: string;
  };

  if (!title || !dueDate) {
    return NextResponse.json({ error: "title and dueDate are required" }, { status: 400 });
  }

  const event = await prisma.taxCalendarEvent.create({
    data: {
      userId: session.user.id,
      title,
      description: description ?? undefined,
      dueDate: new Date(dueDate),
      type: type ?? "FILING",
      status: status ?? "UPCOMING",
      amount: amount ?? undefined,
      notes: notes ?? undefined,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
