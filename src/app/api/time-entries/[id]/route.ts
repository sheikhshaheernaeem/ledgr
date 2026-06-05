import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const entry = await prisma.timeEntry.findFirst({ where: { id, userId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { hours, description, hourlyRate, billable, clientId, date } = body;

  const newHours = hours !== undefined ? Number(hours) : entry.hours;
  const newRate = hourlyRate !== undefined ? Number(hourlyRate) : entry.hourlyRate;
  const newAmount = newHours * newRate;

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(hours !== undefined && { hours: newHours }),
      ...(description !== undefined && { description: description.trim() }),
      ...(hourlyRate !== undefined && { hourlyRate: newRate }),
      ...(billable !== undefined && { billable }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(date !== undefined && { date: new Date(date) }),
      amount: newAmount,
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const entry = await prisma.timeEntry.findFirst({ where: { id, userId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.invoiced) return NextResponse.json({ error: "Cannot delete an invoiced time entry" }, { status: 400 });

  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
