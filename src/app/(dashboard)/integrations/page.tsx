"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Link2, RefreshCw, Unlink, CheckCircle, XCircle } from "lucide-react";

interface Integration { provider: string; status: string; lastSyncAt: string | null; configId: string | null }

const PROVIDER_INFO: Record<string, { label: string; description: string; icon: string; category: string }> = {
  GUSTO: { label: "Gusto", description: "Payroll & HR", icon: "💼", category: "HR & Payroll" },
  ADP: { label: "ADP", description: "Workforce Management", icon: "📊", category: "HR & Payroll" },
  RIPPLING: { label: "Rippling", description: "HR, IT & Finance", icon: "⚡", category: "HR & Payroll" },
  SALESFORCE: { label: "Salesforce", description: "CRM & Sales", icon: "☁️", category: "CRM" },
  HUBSPOT: { label: "HubSpot", description: "Marketing & CRM", icon: "🧲", category: "CRM" },
  NETSUITE: { label: "NetSuite", description: "ERP Platform", icon: "🏢", category: "ERP" },
  SAGE_INTACCT: { label: "Sage Intacct", description: "Cloud ERP", icon: "📐", category: "ERP" },
  STRIPE_ACH: { label: "Stripe ACH", description: "Bank Transfers", icon: "💳", category: "Payments" },
  SHOPIFY: { label: "Shopify", description: "E-commerce", icon: "🛒", category: "E-commerce" },
  XERO: { label: "Xero", description: "Accounting", icon: "📒", category: "Accounting" },
};

const categories = ["HR & Payroll", "CRM", "ERP", "Payments", "E-commerce", "Accounting"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ apiKey: "", apiSecret: "" });

  async function fetchIntegrations() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      setIntegrations(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchIntegrations(); }, []);

  async function handleConnect() {
    if (!connecting) return;
    try {
      const res = await fetch(`/api/integrations/${connecting.toLowerCase()}/connect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(connectForm) });
      if (!res.ok) throw new Error();
      toast.success(`${PROVIDER_INFO[connecting]?.label} connected successfully`);
      setConnecting(null);
      fetchIntegrations();
    } catch { toast.error("Failed to connect"); }
  }

  async function handleSync(provider: string) {
    setSyncing(provider);
    try {
      const res = await fetch(`/api/integrations/${provider.toLowerCase()}/sync`, { method: "POST" });
      const data = await res.json();
      toast.success(`Synced ${data.synced} ${data.entities}`);
      fetchIntegrations();
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(null); }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${PROVIDER_INFO[provider]?.label}?`)) return;
    try {
      await fetch(`/api/integrations/${provider.toLowerCase()}/disconnect`, { method: "POST" });
      toast.success("Disconnected");
      fetchIntegrations();
    } catch { toast.error("Failed"); }
  }

  const intMap = new Map(integrations.map(i => [i.provider, i]));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Integration Hub</h1>
        <p className="text-muted-foreground">Connect Ledgr with your existing tools and platforms</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-8">
          {categories.map(cat => {
            const providers = Object.entries(PROVIDER_INFO).filter(([, info]) => info.category === cat);
            if (providers.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providers.map(([provider, info]) => {
                    const integration = intMap.get(provider);
                    const isActive = integration?.status === "ACTIVE";
                    return (
                      <Card key={provider} className={isActive ? "border-emerald-200 dark:border-emerald-800" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{info.icon}</span>
                              <div>
                                <CardTitle className="text-base">{info.label}</CardTitle>
                                <p className="text-xs text-muted-foreground">{info.description}</p>
                              </div>
                            </div>
                            {isActive ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">{isActive ? "Connected" : "Not connected"}</Badge>
                              {integration?.lastSyncAt && (
                                <p className="text-xs text-muted-foreground mt-1">Last sync: {new Date(integration.lastSyncAt).toLocaleString()}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {isActive ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleSync(provider)} disabled={syncing === provider}>
                                    {syncing === provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDisconnect(provider)}><Unlink className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : (
                                <Button size="sm" onClick={() => { setConnecting(provider); setConnectForm({ apiKey: "", apiSecret: "" }); }} className="gap-1">
                                  <Link2 className="h-3.5 w-3.5" />Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!connecting} onOpenChange={() => setConnecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Connect {connecting ? PROVIDER_INFO[connecting]?.label : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your {connecting ? PROVIDER_INFO[connecting]?.label : ""} API credentials. These are stored securely.</p>
            <div className="space-y-1"><Label>API Key</Label><Input type="password" value={connectForm.apiKey} onChange={e => setConnectForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Enter API key" /></div>
            <div className="space-y-1"><Label>API Secret</Label><Input type="password" value={connectForm.apiSecret} onChange={e => setConnectForm(f => ({ ...f, apiSecret: e.target.value }))} placeholder="Enter API secret" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnecting(null)}>Cancel</Button>
            <Button onClick={handleConnect}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
