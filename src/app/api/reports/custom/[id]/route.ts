import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const report = await prisma.customReport.findFirst({ where: { id, userId: session.user.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const report = await prisma.customReport.findFirst({ where: { id, userId: session.user.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.customReport.update({
    where: { id },
    data: {
      name: body.name ?? report.name,
      description: body.description !== undefined ? body.description : report.description,
      reportType: body.reportType ?? report.reportType,
      configJson: body.configJson ? (typeof body.configJson === "string" ? body.configJson : JSON.stringify(body.configJson)) : report.configJson,
      isPublic: body.isPublic !== undefined ? body.isPublic : report.isPublic,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const report = await prisma.customReport.findFirst({ where: { id, userId: session.user.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
