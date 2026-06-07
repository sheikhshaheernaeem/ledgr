import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PROVIDERS = [
  "GUSTO", "ADP", "RIPPLING", "SALESFORCE", "HUBSPOT", "NETSUITE", "SAGE_INTACCT",
  "STRIPE_ACH", "SHOPIFY", "XERO",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.integrationConfig.findMany({
    where: { userId: session.user.id },
  });

  const configMap = new Map(configs.map(c => [c.provider, c]));

  const integrations = PROVIDERS.map(provider => {
    const config = configMap.get(provider);
    return {
      provider,
      status: config?.status || "INACTIVE",
      lastSyncAt: config?.lastSyncAt || null,
      configId: config?.id || null,
    };
  });

  return NextResponse.json(integrations);
}
