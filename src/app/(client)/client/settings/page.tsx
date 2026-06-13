"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User as UserIcon, Globe, Bell, Shield, CreditCard, UserCheck, Database,
  Loader2, Check, Sparkles, ExternalLink, Save, Plug, Mail,
  Receipt, FileSignature, Download, Trash2,
} from "lucide-react";

interface MeData {
  id: string; email: string; name: string | null;
  companyName: string | null; companyAddress: string | null;
  country: string | null; currency: string | null; locale: string | null; timezone: string | null;
  taxName: string | null; defaultTaxRate: number | null; taxId: string | null; registrationNumber: string | null;
  fiscalYearStartMonth: number | null; dateFormat: string | null; weekStartsOn: number | null;
  emailSignature: string | null; notificationPrefs: string | null;
  twoFactorEnabled: boolean | null;
  vatNumber: string | null;
  accountant: { name: string | null; email: string; companyName: string | null } | null;
}

const COUNTRIES = [
  ["US", "United States", "USD", "America/New_York"],
  ["GB", "United Kingdom", "GBP", "Europe/London"],
  ["CA", "Canada", "CAD", "America/Toronto"],
  ["AU", "Australia", "AUD", "Australia/Sydney"],
  ["DE", "Germany", "EUR", "Europe/Berlin"],
  ["FR", "France", "EUR", "Europe/Paris"],
  ["NL", "Netherlands", "EUR", "Europe/Amsterdam"],
  ["IE", "Ireland", "EUR", "Europe/Dublin"],
  ["IN", "India", "INR", "Asia/Kolkata"],
  ["PK", "Pakistan", "PKR", "Asia/Karachi"],
  ["AE", "UAE", "AED", "Asia/Dubai"],
  ["SG", "Singapore", "SGD", "Asia/Singapore"],
  ["JP", "Japan", "JPY", "Asia/Tokyo"],
  ["BR", "Brazil", "BRL", "America/Sao_Paulo"],
  ["MX", "Mexico", "MXN", "America/Mexico_City"],
  ["ZA", "South Africa", "ZAR", "Africa/Johannesburg"],
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD", "AED", "PKR", "BRL", "MXN", "ZAR", "NZD", "CHF", "SEK", "NOK", "DKK"];
const LOCALES = [
  ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["en-CA", "English (CA)"], ["en-AU", "English (AU)"],
  ["de-DE", "Deutsch"], ["fr-FR", "Français"], ["es-ES", "Español"], ["it-IT", "Italiano"],
  ["pt-BR", "Português (BR)"], ["nl-NL", "Nederlands"], ["sv-SE", "Svenska"],
  ["ja-JP", "日本語"], ["zh-CN", "中文"], ["ar-AE", "العربية"],
];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY", "MMM D, YYYY"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "regional", label: "Regional", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "plan", label: "Plan & Billing", icon: CreditCard },
  { id: "scope", label: "Scope of Service", icon: FileSignature },
  { id: "data", label: "Data & Privacy", icon: Database },
] as const;

type TabId = typeof TABS[number]["id"];

interface NotifPrefs {
  emailMonthlyReport: boolean;
  emailAnomalies: boolean;
  emailWeeklyDigest: boolean;
  emailMessages: boolean;
  emailServiceRequests: boolean;
}
const DEFAULT_NOTIFS: NotifPrefs = {
  emailMonthlyReport: true,
  emailAnomalies: true,
  emailWeeklyDigest: false,
  emailMessages: true,
  emailServiceRequests: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("profile");

  const [profile, setProfile] = useState({ name: "", companyName: "", companyAddress: "", taxId: "", registrationNumber: "", vatNumber: "" });
  const [regional, setRegional] = useState({
    country: "US", currency: "USD", locale: "en-US", timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY", weekStartsOn: 0, fiscalYearStartMonth: 1,
    taxName: "Tax", defaultTaxRate: 0,
  });
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [emailSig, setEmailSig] = useState("");
  const [plan, setPlan] = useState<{ plan: string; status: string; price: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, planRes] = await Promise.all([fetch("/api/me"), fetch("/api/me/plan")]);
      if (!meRes.ok) throw new Error();
      const data: MeData = await meRes.json();
      setMe(data);
      setProfile({
        name: data.name ?? "",
        companyName: data.companyName ?? "",
        companyAddress: data.companyAddress ?? "",
        taxId: data.taxId ?? "",
        registrationNumber: data.registrationNumber ?? "",
        vatNumber: data.vatNumber ?? "",
      });
      setRegional({
        country: data.country ?? "US",
        currency: data.currency ?? "USD",
        locale: data.locale ?? "en-US",
        timezone: data.timezone ?? "America/New_York",
        dateFormat: data.dateFormat ?? "MM/DD/YYYY",
        weekStartsOn: data.weekStartsOn ?? 0,
        fiscalYearStartMonth: data.fiscalYearStartMonth ?? 1,
        taxName: data.taxName ?? "Tax",
        defaultTaxRate: data.defaultTaxRate ?? 0,
      });
      setEmailSig(data.emailSignature ?? "");
      try {
        if (data.notificationPrefs) {
          setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(data.notificationPrefs) });
        }
      } catch {}
      if (planRes.ok) {
        const p = await planRes.json();
        const PRICE: Record<string, number> = { STARTER: 299, GROWTH: 599, CFO: 1499 };
        setPlan({
          plan: (p.plan ?? "STARTER").toUpperCase(),
          status: p.status ?? "ACTIVE",
          price: PRICE[(p.plan ?? "STARTER").toUpperCase()] ?? 299,
        });
      }
    } catch {
      toast.error("Could not load settings");
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save(payload: Record<string, unknown>, success = "Saved") {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(success);
      load();
    } catch {
      toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Billing portal not configured");
    } catch { toast.error("Could not open billing portal"); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <UserIcon className="h-3 w-3" /> settings
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profile, regional, notifications, security, plan, and data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <nav className="space-y-0.5 md:sticky md:top-4 md:self-start">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left ${
                  active ? "bg-emerald-500/12 text-foreground font-medium" : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : ""}`} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-5">
          {tab === "profile" && (
            <>
              <SectionCard title="basic_info">
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="p-name">Your name</Label>
                      <Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="p-email">Email <span className="text-muted-foreground font-mono text-[10px] ml-1">read-only</span></Label>
                      <Input id="p-email" value={me?.email ?? ""} disabled className="bg-muted/30" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="p-co">Business name</Label>
                    <Input id="p-co" value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="p-addr">Business address</Label>
                    <Textarea id="p-addr" value={profile.companyAddress} onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="p-tax">Tax ID (EIN / SSN / ABN)</Label>
                      <Input id="p-tax" value={profile.taxId} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} placeholder="e.g. 12-3456789" />
                    </div>
                    <div>
                      <Label htmlFor="p-reg">Registration number</Label>
                      <Input id="p-reg" value={profile.registrationNumber} onChange={(e) => setProfile({ ...profile, registrationNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="p-vat">VAT number</Label>
                      <Input id="p-vat" value={profile.vatNumber} onChange={(e) => setProfile({ ...profile, vatNumber: e.target.value })} />
                    </div>
                  </div>
                  <SaveRow onClick={() => save(profile, "Profile saved")} saving={saving} />
                </div>
              </SectionCard>

              <SectionCard title="your_accountant" icon={UserCheck}>
                <div className="p-5">
                  {me?.accountant ? (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-foreground uppercase">{(me.accountant.companyName ?? me.accountant.name ?? "?")[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{me.accountant.companyName ?? me.accountant.name ?? "Your accountant"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{me.accountant.email}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/client/messages")}>
                          <Mail className="h-3.5 w-3.5 mr-1.5" /> Message your accountant
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Being assigned within 24 hours.</p>
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {tab === "regional" && (
            <>
              <SectionCard title="country_and_currency">
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="r-country">Country</Label>
                      <select
                        id="r-country"
                        value={regional.country}
                        onChange={(e) => {
                          const c = COUNTRIES.find((x) => x[0] === e.target.value);
                          setRegional({
                            ...regional,
                            country: e.target.value,
                            currency: c?.[2] ?? regional.currency,
                            timezone: c?.[3] ?? regional.timezone,
                          });
                        }}
                        className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
                      >
                        {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="r-curr">Currency</Label>
                      <select id="r-curr" value={regional.currency} onChange={(e) => setRegional({ ...regional, currency: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="locale_and_format">
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="r-loc">Language &amp; locale</Label>
                      <select id="r-loc" value={regional.locale} onChange={(e) => setRegional({ ...regional, locale: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                        {LOCALES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="r-tz">Timezone</Label>
                      <Input id="r-tz" value={regional.timezone} onChange={(e) => setRegional({ ...regional, timezone: e.target.value })} placeholder="America/New_York" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="r-df">Date format</Label>
                      <select id="r-df" value={regional.dateFormat} onChange={(e) => setRegional({ ...regional, dateFormat: e.target.value })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                        {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="r-ws">Week starts on</Label>
                      <select id="r-ws" value={regional.weekStartsOn} onChange={(e) => setRegional({ ...regional, weekStartsOn: parseInt(e.target.value) })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="r-fy">Fiscal year starts</Label>
                      <select id="r-fy" value={regional.fiscalYearStartMonth} onChange={(e) => setRegional({ ...regional, fiscalYearStartMonth: parseInt(e.target.value) })} className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm">
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="tax_settings" icon={Receipt}>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="r-tn">Tax name</Label>
                      <Input id="r-tn" value={regional.taxName} onChange={(e) => setRegional({ ...regional, taxName: e.target.value })} placeholder="VAT, GST, Sales Tax..." />
                    </div>
                    <div>
                      <Label htmlFor="r-tr">Default tax rate (%)</Label>
                      <Input id="r-tr" type="number" step="0.1" value={(regional.defaultTaxRate * 100).toFixed(1)} onChange={(e) => setRegional({ ...regional, defaultTaxRate: parseFloat(e.target.value) / 100 })} />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SaveRow onClick={() => save(regional, "Regional settings saved")} saving={saving} />
            </>
          )}

          {tab === "notifications" && (
            <>
              <SectionCard title="email_notifications">
                <div className="p-5 space-y-1">
                  <NotifToggle label="Monthly report delivered" desc="When your accountant sends the monthly P&L" checked={notifs.emailMonthlyReport} onChange={(v) => setNotifs({ ...notifs, emailMonthlyReport: v })} />
                  <NotifToggle label="Anomaly alerts" desc="When unusual transactions or duplicates are flagged" checked={notifs.emailAnomalies} onChange={(v) => setNotifs({ ...notifs, emailAnomalies: v })} />
                  <NotifToggle label="Weekly digest" desc="Brief summary of your books and activity every Monday" checked={notifs.emailWeeklyDigest} onChange={(v) => setNotifs({ ...notifs, emailWeeklyDigest: v })} />
                  <NotifToggle label="New messages" desc="Email when your accountant sends a message" checked={notifs.emailMessages} onChange={(v) => setNotifs({ ...notifs, emailMessages: v })} />
                  <NotifToggle label="Service request updates" desc="Status changes on your service requests" checked={notifs.emailServiceRequests} onChange={(v) => setNotifs({ ...notifs, emailServiceRequests: v })} />
                </div>
              </SectionCard>

              <SectionCard title="email_signature">
                <div className="p-5 space-y-3">
                  <Label htmlFor="sig">Used on invoices and emails you send through Ledgr</Label>
                  <Textarea id="sig" value={emailSig} onChange={(e) => setEmailSig(e.target.value)} rows={4} placeholder="Best regards,&#10;Your Name&#10;your-company.com" />
                </div>
              </SectionCard>

              <SaveRow onClick={() => save({ notificationPrefs: JSON.stringify(notifs), emailSignature: emailSig }, "Notifications saved")} saving={saving} />
            </>
          )}

          {tab === "security" && (
            <>
              <SectionCard title="password">
                <div className="p-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Change password</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last changed: not tracked</p>
                  </div>
                  <Button variant="outline" onClick={() => router.push("/login/forgot")}>
                    Send reset link
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="two_factor_auth">
                <div className="p-5 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      Two-factor authentication
                      {me?.twoFactorEnabled && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400">
                          enabled
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Required by some firm policies. Adds a second login step from an authenticator app.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => router.push("/account/2fa")}>
                    {me?.twoFactorEnabled ? "Manage" : "Enable"}
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="sessions">
                <div className="p-5 text-sm text-muted-foreground">
                  Sessions auto-expire after 12 hours. Sign out everywhere via your account menu.
                </div>
              </SectionCard>
            </>
          )}

          {tab === "integrations" && (
            <>
              <SectionCard title="bank_connection">
                <div className="p-5"><PlaidRow /></div>
              </SectionCard>
              <SectionCard title="payments">
                <div className="p-5">
                  <IntegrationItem name="Stripe payments" desc="Pull revenue directly from Stripe" status="coming_soon" />
                  <IntegrationItem name="PayPal" desc="Auto-sync PayPal transactions" status="coming_soon" />
                  <IntegrationItem name="Square" desc="Auto-sync Square POS transactions" status="coming_soon" />
                </div>
              </SectionCard>
              <SectionCard title="exports">
                <div className="p-5">
                  <IntegrationItem name="QuickBooks export" desc="Export categorized transactions to QBO" status="available" actionLabel="Export" onClick={() => router.push("/client/financials")} />
                  <IntegrationItem name="Xero export" desc="Export to Xero CSV" status="available" actionLabel="Export" onClick={() => router.push("/client/financials")} />
                </div>
              </SectionCard>
            </>
          )}

          {tab === "plan" && plan && (
            <SectionCard title="current_plan">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{plan.plan}</h3>
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
                      Change plan
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "scope" && (
            <SectionCard title="scope_of_service">
              <div className="p-5 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  Your firm handles your bookkeeping end-to-end — we do the work, you receive the output.
                </p>
                <ul className="text-sm space-y-2 mt-3">
                  {[
                    { t: "Monthly close", d: "All transactions categorized, reconciled, reviewed by your accountant. Reports delivered by the 5th." },
                    { t: "Live AI assistant", d: "Llama 3.3 with read access to your books. Ask anything any time." },
                    { t: "Anomaly detection", d: "Flags duplicates, unusual amounts, fraud signals. Reviewed by your accountant." },
                    { t: "Tax prep (Growth+)", d: "Quarterly estimates, year-end close, federal & state filing where applicable." },
                  ].map((item) => (
                    <li key={item.t} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{item.t}</strong> — {item.d}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-foreground font-mono">Billing cycle:</strong> monthly, auto-renew.</p>
                  <p><strong className="text-foreground font-mono">Response SLA:</strong> 24h Starter · same day Growth · 4h CFO.</p>
                  <p><strong className="text-foreground font-mono">Onboarding:</strong> first close cycle free.</p>
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "data" && (
            <>
              <SectionCard title="export_your_data">
                <div className="p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Download all your transactions, reports, and documents. CSV + JSON formats.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { window.location.href = "/api/transactions/export?format=csv"; }}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Transactions CSV
                    </Button>
                    <Button variant="outline" onClick={() => { window.location.href = "/api/transactions/export?format=quickbooks"; }}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> QuickBooks format
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="data_retention">
                <div className="p-5 text-sm text-muted-foreground space-y-2">
                  <p>We keep your data for as long as your account is active, plus 7 years after closure (required for tax records in most jurisdictions).</p>
                  <p>You can request specific records be deleted via your accountant.</p>
                </div>
              </SectionCard>

              <SectionCard title="danger_zone">
                <div className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Close account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Permanent. Talk to your accountant first about migrating books out.</p>
                  </div>
                  <Button variant="outline" onClick={() => router.push("/client/messages")} className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Request closure
                  </Button>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── helpers ── */

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SaveRow({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onClick} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
        {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving…</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save changes</>}
      </Button>
    </div>
  );
}

function NotifToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-emerald-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

function IntegrationItem({ name, desc, status, actionLabel, onClick }: { name: string; desc: string; status: "available" | "coming_soon" | "connected"; actionLabel?: string; onClick?: () => void }) {
  const styleMap = {
    available: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
    coming_soon: "border-border bg-card/60 text-muted-foreground",
    connected: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${styleMap[status]}`}>{status.replace(/_/g, " ")}</span>
        {actionLabel && onClick && (
          <Button variant="outline" size="sm" onClick={onClick} className="h-7 text-xs">{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}

function PlaidRow() {
  const [state, setState] = useState<{ configured: boolean; env: string; connectionsCount: number; connections: Array<{ id: string; institutionName: string; status: string }> } | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetch("/api/plaid/status").then(async (r) => { if (r.ok) setState(await r.json()); }).catch(() => {});
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/plaid/connect", { method: "POST" });
      const data = await res.json();
      if (data.demo) toast.info("Plaid in demo mode — set PLAID_CLIENT_ID + PLAID_SECRET on the server.");
      else if (data.linkToken) toast.success("Plaid link token issued");
      else toast.error(data.error || "Failed");
    } catch { toast.error("Failed to connect"); }
    finally { setConnecting(false); }
  }

  if (!state) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const status = state.connectionsCount > 0 ? "connected" : state.configured ? "available" : "coming_soon";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Bank connection (Plaid)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === "connected"
              ? `${state.connectionsCount} bank${state.connectionsCount > 1 ? "s" : ""} connected · ${state.env}`
              : status === "available"
              ? `Configured · ${state.env} mode`
              : "Set PLAID_CLIENT_ID + PLAID_SECRET to enable"}
          </p>
        </div>
        {status !== "coming_soon" && (
          <Button variant="outline" size="sm" onClick={connect} disabled={connecting}>
            {connecting ? "..." : status === "connected" ? "Add bank" : "Connect"}
          </Button>
        )}
      </div>
      {state.connections.length > 0 && (
        <ul className="pl-3 space-y-1">
          {state.connections.map((c) => (
            <li key={c.id} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400" /> {c.institutionName} · {c.status.toLowerCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
