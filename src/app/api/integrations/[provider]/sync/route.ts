import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;

  const integration = await prisma.integrationConfig.findFirst({
    where: { userId: session.user.id, provider: provider.toUpperCase() },
  });

  if (!integration) return NextResponse.json({ error: "Integration not connected" }, { status: 404 });
  if (integration.status !== "ACTIVE") return NextResponse.json({ error: "Integration is not active" }, { status: 400 });

  // Mock sync: update last sync time and return realistic mock data
  await prisma.integrationConfig.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  const mockResults: Record<string, { synced: number; entities: string }> = {
    GUSTO: { synced: 12, entities: "employees, payroll runs" },
    ADP: { synced: 8, entities: "employees, time records" },
    RIPPLING: { synced: 15, entities: "employees, benefits, payroll" },
    SALESFORCE: { synced: 47, entities: "opportunities, contacts" },
    HUBSPOT: { synced: 31, entities: "deals, contacts, companies" },
    NETSUITE: { synced: 203, entities: "transactions, accounts, vendors" },
    SAGE_INTACCT: { synced: 87, entities: "journal entries, vendors, customers" },
    STRIPE_ACH: { synced: 22, entities: "payments, transfers" },
    SHOPIFY: { synced: 156, entities: "orders, products, customers" },
    XERO: { synced: 64, entities: "invoices, bills, bank transactions" },
  };

  const result = mockResults[provider.toUpperCase()] || { synced: 0, entities: "none" };

  return NextResponse.json({
    success: true,
    provider: provider.toUpperCase(),
    syncedAt: new Date(),
    ...result,
  });
}
