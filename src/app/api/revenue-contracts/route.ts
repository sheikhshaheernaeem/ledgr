import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contracts = await prisma.revenueContract.findMany({
    where: { userId: session.user.id },
    include: {
      client: { select: { id: true, name: true } },
      obligations: true,
      schedules: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contracts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { contractNumber, clientId, name, totalValue, currency, startDate, endDate, status, recognitionMethod, notes } = body;

    if (!contractNumber || !name || !totalValue || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const contract = await prisma.revenueContract.create({
      data: {
        userId: session.user.id,
        contractNumber,
        clientId: clientId || null,
        name,
        totalValue: parseFloat(totalValue),
        currency: currency || "USD",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || "ACTIVE",
        recognitionMethod: recognitionMethod || "STRAIGHT_LINE",
        notes: notes || null,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Contract number already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
