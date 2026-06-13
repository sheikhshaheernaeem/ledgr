"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User as UserIcon, Building2, Mail, Globe, DollarSign,
  CreditCard, UserCheck, Loader2, Check, Sparkles, ExternalLink, Save,
} from "lucide-react";

interface MeData {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  country: string | null;
  currency: string | null;
  locale: string | null;
  timezone: string | null;
  taxName: string | null;
  defaultTaxRate: number | null;
  hasStatement: boolean;
  accountant: { name: string | null; email: string; companyName: string | null } | null;
}

interface PlanInfo {
  plan: string;
  status: string;
  price: number;
  features: string[];
}

const PLAN_DETAILS: Record<string, PlanInfo> = {
  STARTER: {
    plan: "Starter",
    status: "ACTIVE",
    price: 299,
    features: ["Up to 200 transactions/month", "Monthly P&L", "AI categorization + human review", "AI assistant", "Email support"],
  },
  GROWTH: {
    plan: "Growth",
    status: "ACTIVE",
    price: 599,
    features: ["Up to 500 transactions/month", "P&L + quarterly deep-dive", "Tax prep included", "Cash flow forecasting", "Priority 24h support"],
  },
  CFO: {
    plan: "CFO",
    status: "ACTIVE",
    price: 1499,
    features: ["Unlimited transactions", "Dedicated human accountant", "Weekly check-ins", "Board-ready financials", "Full fractional CFO"],
  },
};

const COUNTRIES = [
  ["US", "United States", "USD"], ["GB", "United Kingdom", "GBP"], ["CA", "Canada", "CAD"],
  ["AU", "Australia", "AUD"], ["DE", "Germany", "EUR"], ["FR", "France", "EUR"],
  ["IN", "India", "INR"], ["PK", "Pakistan", "PKR"], ["AE", "UAE", "AED"],
  ["SG", "Singapore", "SGD"], ["JP", "Japan", "JPY"], ["NL", "Netherlands", "EUR"],
];

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<PlanInfo | null>(null);

  // form state
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    country: "US",
    currency: "USD",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, planRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/me/plan"),
      ]);
      if (!meRes.ok) throw new Error("Failed to load profile");

      const meData: MeData = await meRes.json();
      setMe(meData);
      setForm({
        name: meData.name ?? "",
        companyName: meData.companyName ?? "",
        country: meData.country ?? "US",
        currency: meData.currency ?? "USD",
      });

      if (planRes.ok) {
        const p = await planRes.json();
        setPlan(PLAN_DETAILS[p.plan?.toUpperCase()] ?? PLAN_DETAILS.STARTER);
      } else {
        setPlan(PLAN_DETAILS.STARTER);
      }
    } catch {
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile saved");
      load();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Billing portal not configured");
    } catch {
      toast.error("Could not open billing portal");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <UserIcon className="h-3 w-3" /> settings
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Account settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profile, plan, and your assigned accountant.
        </p>
      </div>

      {/* Engagement / scope of service */}
      <Section title="scope_of_service" icon={UserCheck}>
        <div className="p-5 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Your firm handles your bookkeeping end-to-end — we do the work, you receive the output.
          </p>
          <ul className="text-sm space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Monthly close</strong> — all transactions categorized, reconciled, reviewed by your accountant. Reports delivered by the 5th.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Live AI assistant</strong> — Llama 3.3 with read access to your books. Ask anything any time.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Anomaly detection</strong> — flags duplicates, unusual amounts, fraud signals. Reviewed by your accountant.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Tax prep (Growth+)</strong> — quarterly estimates, year-end close, federal &amp; state filing where applicable.</span>
            </li>
          </ul>
          <div className="border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground font-mono">Billing cycle:</strong> monthly, auto-renew. Cancel anytime via &quot;Manage billing&quot;.</p>
            <p><strong className="text-foreground font-mono">Response SLA:</strong> 24h Starter · same day Growth · 4h CFO.</p>
            <p><strong className="text-foreground font-mono">Onboarding:</strong> first close cycle is free. You see actual output before paying.</p>
          </div>
        </div>
      </Section>

      {/* Plan card */}
      {plan && (
        <Section title="current_plan" icon={CreditCard}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-foreground text-lg">{plan.plan}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 border border-emerald-500/30 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded">
                      {plan.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openBillingPortal}>
                  Manage billing <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                <Button onClick={() => router.push("/upgrade")} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                  Upgrade
                </Button>
              </div>
            </div>
            <ul className="mt-4 pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Assigned accountant */}
      <Section title="your_accountant" icon={UserCheck}>
        <div className="p-5">
          {me?.accountant ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-foreground uppercase">
                  {(me.accountant.companyName ?? me.accountant.name ?? "?")[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{me.accountant.companyName ?? me.accountant.name ?? "Your accountant"}</p>
                <p className="text-sm text-muted-foreground font-mono">{me.accountant.email}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/client/messages")}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Message your accountant
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Being assigned within 24 hours.</p>
              <p className="text-xs text-muted-foreground/60 mt-1 font-mono">we_match_based_on_industry_and_size</p>
            </div>
          )}
        </div>
      </Section>

      {/* Profile */}
      <Section title="profile" icon={UserIcon}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-1.5 relative">
                <Input id="email" value={me?.email ?? ""} disabled className="bg-muted/30" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground">read-only</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="company">Business name</Label>
            <div className="mt-1.5 relative">
              <Building2 className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="company"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="pl-9"
                placeholder="Acme Inc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={form.country}
                onChange={(e) => {
                  const c = COUNTRIES.find((x) => x[0] === e.target.value);
                  setForm({ ...form, country: e.target.value, currency: c?.[2] ?? form.currency });
                }}
                className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <div className="mt-1.5 relative">
                <DollarSign className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {me?.taxName && (
            <div className="rounded-md bg-background border border-border/60 px-3 py-2 text-xs text-muted-foreground font-mono">
              tax_rate: {((me.defaultTaxRate ?? 0) * 100).toFixed(0)}% ({me.taxName}) ·
              locale: {me.locale ?? "—"} · timezone: {me.timezone ?? "—"}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button onClick={saveProfile} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving…</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save changes</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* Integrations */}
      <Section title="integrations" icon={Globe}>
        <div className="p-5 space-y-3">
          <PlaidIntegrationRow />
          <IntegrationRow
            name="Stripe payments"
            desc="Pull revenue directly from Stripe"
            status="coming_soon"
          />
          <IntegrationRow
            name="QuickBooks export"
            desc="Export categorized transactions to QuickBooks"
            status="available"
            action={() => router.push("/client/transactions")}
            actionLabel="Export"
          />
        </div>
      </Section>
    </div>
  );
}

function PlaidIntegrationRow() {
  const [state, setState] = useState<{
    configured: boolean;
    env: string;
    connectionsCount: number;
    connections: Array<{ id: string; institutionName: string; status: string }>;
  } | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetch("/api/plaid/status").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setState(data);
      }
    }).catch(() => {});
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/plaid/connect", { method: "POST" });
      const data = await res.json();
      if (data.demo) {
        toast.info("Plaid is in demo mode. Set PLAID_CLIENT_ID and PLAID_SECRET to enable real bank connections.");
      } else if (data.linkToken) {
        toast.success(`Plaid link token issued — open Plaid Link with: ${data.linkToken.slice(0, 20)}...`);
      } else {
        toast.error(data.error || "Failed to start Plaid flow");
      }
    } catch {
      toast.error("Failed to connect to Plaid");
    } finally {
      setConnecting(false);
    }
  }

  if (!state) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-border/40">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Bank connection (Plaid)</p>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const status: "connected" | "available" | "setup_required" =
    state.connectionsCount > 0 ? "connected" : state.configured ? "available" : "setup_required";

  const statusStyle = {
    setup_required: "border-amber-500/30 bg-amber-500/[0.08] text-amber-400",
    available: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
    connected: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
    coming_soon: "border-border bg-card/60 text-muted-foreground",
  }[status];

  const desc = status === "connected"
    ? `${state.connectionsCount} bank${state.connectionsCount > 1 ? "s" : ""} connected · ${state.env}`
    : status === "available"
    ? `Configured · ${state.env} mode · auto-sync instead of CSV uploads`
    : "Set PLAID_CLIENT_ID and PLAID_SECRET on Vercel to enable bank auto-sync";

  return (
    <div className="border-b border-border/40">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Bank connection (Plaid)</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle}`}>
            {status.replace(/_/g, " ")}
          </span>
          {status !== "setup_required" && (
            <Button variant="outline" size="sm" onClick={connect} disabled={connecting} className="h-7 text-xs">
              {connecting ? "..." : status === "connected" ? "Add another" : "Connect bank"}
            </Button>
          )}
        </div>
      </div>
      {state.connections.length > 0 && (
        <ul className="pb-3 pl-2 space-y-1">
          {state.connections.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>{c.institutionName}</span>
              <span className="text-muted-foreground/60">· {c.status.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* helpers */

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function IntegrationRow({ name, desc, status, action, actionLabel }: {
  name: string; desc: string;
  status: "setup_required" | "available" | "coming_soon" | "connected";
  action?: () => void; actionLabel?: string;
}) {
  const statusStyle = {
    setup_required: "border-amber-500/30 bg-amber-500/[0.08] text-amber-400",
    available: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
    coming_soon: "border-border bg-card/60 text-muted-foreground",
    connected: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
  }[status];

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle}`}>
          {status.replace(/_/g, " ")}
        </span>
        {action && actionLabel && (
          <Button variant="outline" size="sm" onClick={action} className="h-7 text-xs">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
