import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({
    where: { id, userId },
    include: { employees: true },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({ where: { id, userId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (run.status === "PROCESSED") {
    const body = await req.json();
    // Only allow voiding a PROCESSED run
    if (body.status === "VOID") {
      const updated = await prisma.payrollRun.update({
        where: { id },
        data: { status: "VOID" },
        include: { employees: true },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Cannot edit a PROCESSED payroll run" }, { status: 400 });
  }

  const body = await req.json();
  const { status, notes } = body;

  const updated = await prisma.payrollRun.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { employees: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const run = await prisma.payrollRun.findFirst({ where: { id, userId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status !== "DRAFT") return NextResponse.json({ error: "Only DRAFT payroll runs can be deleted" }, { status: 400 });

  await prisma.payrollRun.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
