import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true, name: true, email: true, companyName: true,
      managedByAccounts: { where: { isActive: true }, select: { accountantId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      companyName: c.companyName,
      managedByAccounts: c.managedByAccounts.map((m) => m.accountantId),
    })),
  });
}
