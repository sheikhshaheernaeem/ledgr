import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const FULL_SELECT = {
  id: true, email: true, name: true, companyName: true, companyAddress: true,
  country: true, currency: true, locale: true, timezone: true,
  taxName: true, defaultTaxRate: true, taxId: true, registrationNumber: true,
  fiscalYearStartMonth: true, dateFormat: true, weekStartsOn: true,
  emailSignature: true,
  notificationPrefs: true,
  twoFactorEnabled: true,
  vatNumber: true,
  invoiceBrandColor: true, invoiceFooterText: true,
  role: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const [user, statementCount, managedBy] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: FULL_SELECT }),
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
  const stringFields = [
    "name", "companyName", "companyAddress",
    "country", "currency", "locale", "timezone",
    "taxName", "taxId", "registrationNumber",
    "dateFormat", "emailSignature", "vatNumber",
    "invoiceBrandColor", "invoiceFooterText",
    "notificationPrefs",
  ];
  const numberFields = ["defaultTaxRate", "fiscalYearStartMonth", "weekStartsOn"];

  const allowed: Record<string, unknown> = {};
  for (const key of stringFields) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }
  for (const key of numberFields) {
    if (body[key] !== undefined) allowed[key] = Number(body[key]);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: allowed,
    select: FULL_SELECT,
  });

  return NextResponse.json(updated);
}
