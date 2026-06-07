import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.customReport.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, reportType, configJson, isPublic } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const report = await prisma.customReport.create({
    data: {
      userId: session.user.id,
      name,
      description: description || null,
      reportType: reportType || "TABLE",
      configJson: typeof configJson === "string" ? configJson : JSON.stringify(configJson || {}),
      isPublic: isPublic || false,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
