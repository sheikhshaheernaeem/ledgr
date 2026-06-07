import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (year) {
    const y = parseInt(year);
    where.date = {
      gte: new Date(`${y}-01-01`),
      lt: new Date(`${y + 1}-01-01`),
    };
  }

  const entries = await prisma.mileageEntry.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    date,
    description,
    fromAddress,
    toAddress,
    miles,
    ratePerMile,
    purpose,
    clientId,
  } = body as {
    date: string;
    description: string;
    fromAddress?: string;
    toAddress?: string;
    miles: number;
    ratePerMile?: number;
    purpose?: string;
    clientId?: string;
  };

  if (!date || !description || miles == null) {
    return NextResponse.json(
      { error: "date, description, and miles are required" },
      { status: 400 }
    );
  }

  const rate = ratePerMile ?? 0.67;
  const amount = miles * rate;

  const entry = await prisma.mileageEntry.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      description,
      fromAddress: fromAddress ?? undefined,
      toAddress: toAddress ?? undefined,
      miles,
      ratePerMile: rate,
      amount,
      purpose: purpose ?? "BUSINESS",
      clientId: clientId ?? undefined,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
