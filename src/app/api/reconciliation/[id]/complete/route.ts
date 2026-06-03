import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
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
    include: { items: true },
  });

  if (!reconciliation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unmatched = reconciliation.items.filter((item) => !item.matched);
  if (unmatched.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot complete reconciliation: ${unmatched.length} item(s) are not matched`,
        unmatchedCount: unmatched.length,
      },
      { status: 422 }
    );
  }

  const updated = await prisma.reconciliation.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: { items: true },
  });

  return NextResponse.json(updated);
}
