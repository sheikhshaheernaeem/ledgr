import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const accounts = await prisma.chartOfAccount.findMany({
    where: { userId },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const { code, name, type, subtype, description, parentCode, normalBalance } = body;

  if (!code || !name || !type) {
    return NextResponse.json({ error: "code, name, and type are required" }, { status: 400 });
  }

  // Check code uniqueness
  const existing = await prisma.chartOfAccount.findUnique({
    where: { userId_code: { userId, code } },
  });
  if (existing) {
    return NextResponse.json({ error: `Account code ${code} already exists` }, { status: 409 });
  }

  // Derive default normalBalance from type if not provided
  const nb = normalBalance ?? (["ASSET", "EXPENSE"].includes(type) ? "DEBIT" : "CREDIT");

  const account = await prisma.chartOfAccount.create({
    data: { userId, code, name, type, subtype, description, parentCode, normalBalance: nb },
  });

  return NextResponse.json(account, { status: 201 });
}
