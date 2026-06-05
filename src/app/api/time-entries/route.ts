import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const invoicedParam = searchParams.get("invoiced");

  const where: Record<string, unknown> = { userId };
  if (clientId) where.clientId = clientId;
  if (invoicedParam !== null) where.invoiced = invoicedParam === "true";

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { clientId, date, hours, description, hourlyRate, billable } = body;

  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  if (hours == null || isNaN(Number(hours))) return NextResponse.json({ error: "hours is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const rate = Number(hourlyRate ?? 0);
  const h = Number(hours);
  const amount = h * rate;

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      clientId: clientId || null,
      date: new Date(date),
      hours: h,
      description: description.trim(),
      hourlyRate: rate,
      amount,
      billable: billable !== false,
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(entry, { status: 201 });
}
