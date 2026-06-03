import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: {
        include: {
          transaction: true,
        },
      },
    },
  });

  if (!reconciliation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(reconciliation);
}
