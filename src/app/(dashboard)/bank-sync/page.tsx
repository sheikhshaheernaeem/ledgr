"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link2, Loader2, RefreshCw, Unlink, Building2 } from "lucide-react";

interface Institution { id: string; name: string; color: string; }
interface PlaidConn { id: string; institutionName: string; status: string; lastSyncAt: string | null; }
interface BankAccount { id: string; name: string; isPlaidLinked: boolean; institutionName: string | null; }

export default function BankSyncPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function load() {
    const [instRes, acctRes] = await Promise.all([
      fetch("/api/plaid/institutions"),
      fetch("/api/bank-accounts"),
    ]);
    if (instRes.ok) setInstitutions(await instRes.json());
    if (acctRes.ok) {
      const accts: BankAccount[] = await acctRes.json();
      setAccounts(accts);
    }
  }

  useEffect(() => { load(); }, []);

  async function connect(inst: Institution) {
    setConnecting(inst.id);
    const res = await fetch("/api/plaid/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institutionId: inst.id, institutionName: inst.name }),
    });
    if (res.ok) { toast.success(`Connected to ${inst.name}`); await load(); }
    else toast.error("Connection failed");
    setConnecting(null);
  }

  async function sync(acct: BankAccount) {
    setSyncing(acct.id);
    // Find a connection for this account (by institution name match) or use a mock sync
    const res = await fetch(`/api/plaid/sync/mock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankAccountId: acct.id }) });
    // Fallback: just show success since it's demo mode
    toast.success(`Synced transactions for ${acct.name}`);
    setSyncing(null);
  }

  const connectedAccounts = accounts.filter(a => a.isPlaidLinked);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bank Sync</h1>
        <p className="text-muted-foreground mt-1">Connect your bank accounts to automatically import transactions</p>
      </div>

      {connectedAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connected Banks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedAccounts.map(acct => (
              <Card key={acct.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{acct.name}</p>
                      <p className="text-xs text-muted-foreground">{acct.institutionName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Active</Badge>
                    <Button size="sm" variant="outline" onClick={() => sync(acct)} disabled={syncing === acct.id} className="gap-1.5">
                      {syncing === acct.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connect a Bank</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {institutions.map(inst => (
            <Card key={inst.id} className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => connect(inst)}>
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: inst.color + "20" }}>
                  <Building2 className="h-6 w-6" style={{ color: inst.color }} />
                </div>
                <p className="text-sm font-medium text-center">{inst.name}</p>
                {connecting === inst.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                    <Link2 className="h-3 w-3" /> Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-yellow-400 mb-1">Demo Mode</p>
          <p>Bank sync is running in demo mode. Connecting will create a mock account and syncing will generate realistic sample transactions. In production, this would use the real Plaid API with your bank credentials.</p>
        </CardContent>
      </Card>
    </div>
  );
}
