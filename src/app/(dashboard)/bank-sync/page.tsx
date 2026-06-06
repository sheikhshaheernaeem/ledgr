"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Loader2, RefreshCw, Building2, ExternalLink, Info } from "lucide-react";

interface PlaidConn { id: string; institutionName: string; status: string; lastSyncAt: string | null; }
interface BankAccount { id: string; name: string; isPlaidLinked: boolean; institutionName: string | null; plaidAccountId: string | null; }

// Demo institutions for when Plaid is not configured
const DEMO_INSTITUTIONS = [
  { id: "ins_demo_chase", name: "Chase", color: "#117ACA" },
  { id: "ins_demo_bofa", name: "Bank of America", color: "#E31837" },
  { id: "ins_demo_wells", name: "Wells Fargo", color: "#D71E28" },
  { id: "ins_demo_citi", name: "Citibank", color: "#003B70" },
];

export default function BankSyncPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function loadAccounts() {
    const res = await fetch("/api/bank-accounts");
    if (res.ok) setAccounts(await res.json());
  }

  async function loadConnections() {
    const res = await fetch("/api/plaid/connections");
    if (res.ok) setConnections(await res.json());
  }

  useEffect(() => {
    loadAccounts();
    loadConnections();
  }, []);

  // Connect a bank — real Plaid Link or demo flow
  async function connect(institutionId: string, institutionName: string) {
    setConnecting(institutionId);
    try {
      // Step 1: get link token
      const tokenRes = await fetch("/api/plaid/connect", { method: "POST" });
      if (!tokenRes.ok) { toast.error("Could not start bank connection"); return; }
      const { linkToken, demo } = await tokenRes.json();
      setIsDemo(demo);

      if (demo) {
        // Demo mode: skip the real Plaid Link widget and directly exchange with a mock token
        const exchangeRes = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken: "demo-public-token",
            institutionId,
            institutionName,
          }),
        });
        if (!exchangeRes.ok) { toast.error("Connection failed"); return; }
        toast.success(`Connected to ${institutionName} (demo)`);
        await loadAccounts();
        await loadConnections();
      } else {
        // Real Plaid mode: inform user the Link widget needs to be opened
        // In a full implementation you would load the Plaid Link JS SDK and call open()
        // For now, copy the link token to clipboard and show instructions
        await navigator.clipboard.writeText(linkToken).catch(() => {});
        toast.info(
          `Plaid Link token created. Integrate the @plaid/link-web SDK in your front-end to open the Link widget. Token: ${linkToken.slice(0, 20)}…`,
          { duration: 8000 }
        );
      }
    } finally {
      setConnecting(null);
    }
  }

  // Sync transactions for a connected account
  async function sync(acct: BankAccount) {
    setSyncing(acct.id);
    try {
      // Find the connection ID linked to this bank account
      const conn = connections.find(
        (c) => acct.plaidAccountId === c.id || c.institutionName === acct.institutionName
      );

      if (conn) {
        const res = await fetch(`/api/plaid/sync/${conn.id}`, { method: "POST" });
        if (res.ok) {
          const { imported } = await res.json();
          toast.success(`Synced ${imported} new transactions for ${acct.name}`);
        } else {
          toast.error("Sync failed");
        }
      } else {
        // Fallback: mock sync against the bank account directly
        const res = await fetch("/api/plaid/sync/mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankAccountId: acct.id }),
        });
        if (res.ok) {
          const { imported } = await res.json();
          toast.success(`Synced ${imported} transactions for ${acct.name}`);
        }
      }
      await loadAccounts();
    } finally {
      setSyncing(null);
    }
  }

  const connectedAccounts = accounts.filter((a) => a.isPlaidLinked);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bank Sync</h1>
        <p className="text-muted-foreground mt-1">Connect your bank accounts to automatically import transactions</p>
      </div>

      {/* Connected banks */}
      {connectedAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connected Banks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedAccounts.map((acct) => {
              const conn = connections.find(
                (c) => acct.plaidAccountId === c.id || c.institutionName === acct.institutionName
              );
              return (
                <Card key={acct.id} className="border-border bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{acct.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {acct.institutionName}
                          {conn?.lastSyncAt && (
                            <> · Last sync: {new Date(conn.lastSyncAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Active</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sync(acct)}
                        disabled={syncing === acct.id}
                        className="gap-1.5"
                      >
                        {syncing === acct.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect a bank */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connect a Bank</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DEMO_INSTITUTIONS.map((inst) => (
            <Card
              key={inst.id}
              className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => connect(inst.id, inst.name)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: inst.color + "20" }}
                >
                  <Building2 className="h-6 w-6" style={{ color: inst.color }} />
                </div>
                <p className="text-sm font-medium text-center">{inst.name}</p>
                {connecting === inst.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" tabIndex={-1}>
                    <Link2 className="h-3 w-3" /> Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Status banner */}
      {isDemo ? (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
              <Info className="h-4 w-4" /> Demo Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-sm text-muted-foreground space-y-1">
            <p>Bank sync is running in demo mode. Connections generate mock bank accounts and syncing creates realistic sample transactions.</p>
            <p className="mt-2">
              To enable real Plaid integration, set these environment variables:
            </p>
            <pre className="mt-1 rounded bg-muted px-3 py-2 text-xs font-mono text-foreground">
              {`PLAID_CLIENT_ID=your_client_id\nPLAID_SECRET=your_sandbox_secret\nPLAID_ENV=sandbox   # or development / production`}
            </pre>
            <p className="text-xs mt-2">
              Get your credentials at{" "}
              <a
                href="https://dashboard.plaid.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 hover:underline"
              >
                dashboard.plaid.com <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-4 pb-4 text-sm text-muted-foreground">
            <p className="font-medium text-emerald-400 mb-1">Plaid Connected</p>
            <p>Real Plaid integration is active. Connecting a bank will open the secure Plaid Link widget.</p>
            <p className="text-xs mt-1 text-muted-foreground">
              Note: Install and initialize <code className="font-mono bg-muted px-1 rounded">@plaid/link-web</code> or use{" "}
              <code className="font-mono bg-muted px-1 rounded">react-plaid-link</code> to render the full Plaid Link dialog.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
