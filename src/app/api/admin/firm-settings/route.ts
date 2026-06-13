import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function adminGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { userId: session.user.id as string };
}

export async function GET() {
  const g = await adminGate();
  if ("error" in g) return g.error;

  // Singleton — create with defaults if missing
  const settings = await prisma.firmSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const g = await adminGate();
  if ("error" in g) return g.error;

  const body = await req.json();

  // Allowlist by type so we can coerce values before they hit Prisma
  // (form inputs arrive as strings; Int/Float/Boolean columns reject those).
  const stringFields = [
    "firmName", "firmLogoUrl", "firmEmail", "firmPhone", "firmAddress", "firmWebsite", "firmTaxId",
    "defaultCountry", "defaultCurrency", "defaultLocale", "defaultTimezone", "defaultTaxName",
    "defaultDateFormat",
    "supportedCurrenciesJson", "supportedCountriesJson", "supportedLanguagesJson",
    "defaultPlan",
    "brandPrimaryColor", "brandAccentColor", "brandFont", "customDomain",
    "emailSenderName", "emailSignature", "emailReplyTo",
    "ipAllowlistJson", "ssoProvider",
    "digestFrequency",
  ];
  const intFields = [
    "defaultFiscalStartMonth", "trialDays", "sessionTimeoutMinutes", "passwordMinLength",
    "auditRetentionDays", "closeDayOfMonth", "responseSlaStarter", "responseSlaGrowth", "responseSlaCfo",
  ];
  const floatFields = ["defaultTaxRate", "largeTxnThreshold"];
  const boolFields = [
    "enforceTwoFactor", "ssoEnabled",
    "notifyOnNewClient", "notifyOnAnomaly", "notifyOnLargeTxn",
  ];

  const data: Record<string, unknown> = {};
  for (const key of stringFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const key of intFields) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      const n = parseInt(String(body[key]), 10);
      if (!Number.isNaN(n)) data[key] = n;
    }
  }
  for (const key of floatFields) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      const n = parseFloat(String(body[key]));
      if (!Number.isNaN(n)) data[key] = n;
    }
  }
  for (const key of boolFields) {
    if (body[key] !== undefined) data[key] = Boolean(body[key]);
  }

  const updated = await prisma.firmSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  return NextResponse.json(updated);
}
