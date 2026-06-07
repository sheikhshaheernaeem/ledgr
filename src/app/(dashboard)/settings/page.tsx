import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SettingsForm from "./SettingsForm";
import TwoFASettings from "./TwoFASettings";
import ApiKeysSettings from "./ApiKeysSettings";
import WebhooksSettings from "./WebhooksSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: {
      paymentLink: true,
      customCategories: true,
      companyName: true,
      companyAddress: true,
      companyLogo: true,
      revenueGoal: true,
      invoiceBrandColor: true,
      invoiceFooterText: true,
      twoFactorEnabled: true,
    },
  });

  const [apiKeysRaw, webhooksRaw] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: session.user.id as string },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhook.findMany({
      where: { userId: session.user.id as string },
      select: { id: true, url: true, events: true, isActive: true, description: true, lastPingAt: true, failCount: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function tryParseJson(str: string, fallback: string[]): string[] {
    try { return JSON.parse(str) as string[]; } catch { return fallback; }
  }

  const apiKeys = apiKeysRaw.map(k => ({
    ...k,
    scopes: tryParseJson(k.scopes, ["read"]),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
  const webhooks = webhooksRaw.map(w => ({
    ...w,
    events: tryParseJson(w.events, []),
    lastPingAt: w.lastPingAt?.toISOString() ?? null,
  }));

  const customCategories = user?.customCategories ? JSON.parse(user.customCategories) as string[] : [];

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name, payment link, and password</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialName={session.user.name ?? ""}
            email={session.user.email ?? ""}
            initialPaymentLink={user?.paymentLink ?? ""}
            initialCustomCategories={customCategories}
            initialCompanyName={user?.companyName ?? ""}
            initialCompanyAddress={user?.companyAddress ?? ""}
            initialCompanyLogo={user?.companyLogo ?? ""}
            initialRevenueGoal={user?.revenueGoal ?? null}
            initialInvoiceBrandColor={user?.invoiceBrandColor ?? "#10b981"}
            initialInvoiceFooterText={user?.invoiceFooterText ?? ""}
          />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-mono text-xs">{session.user.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account ID</span>
            <span className="text-foreground font-mono text-xs">{session.user.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground">{(session.user as { role?: string }).role ?? "USER"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFASettings enabled={user?.twoFactorEnabled ?? false} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>Create keys to access the Ledgr API from external apps</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysSettings initialKeys={apiKeys} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Webhooks</CardTitle>
          <CardDescription>Receive real-time events when data changes in Ledgr</CardDescription>
        </CardHeader>
        <CardContent>
          <WebhooksSettings initialWebhooks={webhooks} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Your financial data is encrypted at rest and in transit. We never sell your data to third parties.</p>
          <p>All AI processing uses your transaction descriptions only — no account numbers or personal identifiers are sent to AI models.</p>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium text-sm">Export All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Download all your transactions, invoices, clients, and account data as JSON (GDPR compliant).</p>
            </div>
            <a href="/api/export/all" download="ledgr-export.json" className="shrink-0 ml-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors">Export All Data</a>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium text-sm">Export Transactions (CSV)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Download your transactions as a CSV file.</p>
            </div>
            <a href="/api/export/transactions?format=csv" download="transactions.csv" className="shrink-0 ml-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors">Export CSV</a>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium text-sm">Export for QuickBooks</p>
              <p className="text-xs text-muted-foreground mt-0.5">Download your data in QuickBooks-compatible format.</p>
            </div>
            <a href="/api/export/quickbooks" download="ledgr-quickbooks.json" className="shrink-0 ml-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors">Export QB</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
