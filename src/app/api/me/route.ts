import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/me — returns the current user's profile, plus onboarding state
 * (whether they have uploaded a statement) and the assigned accountant (if any).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const [user, statementCount, managedBy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, companyName: true,
        country: true, currency: true, locale: true, timezone: true,
        taxName: true, defaultTaxRate: true, role: true,
      },
    }),
    prisma.statement.count({ where: { userId } }),
    prisma.managedClient.findFirst({
      where: { clientId: userId, isActive: true },
      include: { accountant: { select: { name: true, email: true, companyName: true } } },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...user,
    hasStatement: statementCount > 0,
    accountant: managedBy?.accountant ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const key of ["name", "companyName", "country", "currency", "locale", "timezone", "taxName", "defaultTaxRate"]) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: allowed,
    select: {
      id: true, email: true, name: true, companyName: true,
      country: true, currency: true, locale: true, timezone: true,
      taxName: true, defaultTaxRate: true,
    },
  });

  return NextResponse.json(updated);
}
