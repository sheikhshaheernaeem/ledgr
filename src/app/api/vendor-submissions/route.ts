import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.vendorBillSubmission.findMany({
    where: { invite: { userId: session.user.id } },
    include: { invite: { select: { vendorEmail: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}
