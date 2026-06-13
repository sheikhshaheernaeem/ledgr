import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.mileageEntry.findMany({
    where: { userId: session.user.id as string },
    orderBy: { date: "desc" },
    take: 200,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { date, description, fromAddress, toAddress, miles, ratePerMile, purpose } = body as {
    date: string; description: string; fromAddress?: string; toAddress?: string;
    miles: number; ratePerMile?: number; purpose?: string;
  };
  if (!date || !description?.trim() || !miles) {
    return NextResponse.json({ error: "date, description, miles required" }, { status: 400 });
  }
  const rate = ratePerMile ?? 0.67;
  const amount = miles * rate;

  const entry = await prisma.mileageEntry.create({
    data: {
      userId: session.user.id as string,
      date: new Date(date),
      description: description.trim(),
      fromAddress: fromAddress?.trim() || null,
      toAddress: toAddress?.trim() || null,
      miles,
      ratePerMile: rate,
      amount,
      purpose: purpose || "BUSINESS",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const entry = await prisma.mileageEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.mileageEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
