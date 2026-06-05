import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.bill.count({ where: { userId: session.user.id } });
  const billNumber = `BILL-${String(count + 1).padStart(4, "0")}`;

  return NextResponse.json({ billNumber });
}
