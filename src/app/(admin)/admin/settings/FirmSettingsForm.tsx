"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Globe, Map, CreditCard, Palette, Mail, Shield, Bell,
  FileCheck, ArrowLeft, Loader2, Save, Settings as SettingsIcon,
} from "lucide-react";

interface FirmSettings {
  firmName: string;
  firmLogoUrl: string | null;
  firmEmail: string | null;
  firmPhone: string | null;
  firmAddress: string | null;
  firmWebsite: string | null;
  firmTaxId: string | null;

  defaultCountry: string;
  defaultCurrency: string;
  defaultLocale: string;
  defaultTimezone: string;
  defaultTaxName: string;
  defaultTaxRate: number;
  defaultFiscalStartMonth: number;
  defaultDateFormat: string;

  supportedCurrenciesJson: string;
  supportedCountriesJson: string;
  supportedLanguagesJson: string;

  defaultPlan: string;
  trialDays: number;

  brandPrimaryColor: string;
  brandAccentColor: string;
  brandFont: string;
  customDomain: string | null;

  emailSenderName: string;
  emailSignature: string | null;
  emailReplyTo: string | null;

  enforceTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  ipAllowlistJson: string;
  ssoEnabled: boolean;
  ssoProvider: string | null;

  notifyOnNewClient: boolean;
  notifyOnAnomaly: boolean;
  notifyOnLargeTxn: boolean;
  largeTxnThreshold: number;
  digestFrequency: string;

  auditRetentionDays: number;
  closeDayOfMonth: number;
  responseSlaStarter: number;
  responseSlaGrowth: number;
  responseSlaCfo: number;
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
const ALL_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD", "AED", "PKR", "BRL", "MXN", "ZAR", "NZD", "CHF", "SEK", "NOK", "DKK"];
const ALL_LOCALES = [
  ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["en-CA", "English (CA)"], ["en-AU", "English (AU)"],
  ["de-DE", "Deutsch"], ["fr-FR", "Français"], ["es-ES", "Español"], ["it-IT", "Italiano"],
  ["pt-BR", "Português (BR)"], ["nl-NL", "Nederlands"], ["sv-SE", "Svenska"],
  ["ja-JP", "日本語"], ["zh-CN", "中文"], ["ar-AE", "العربية"],
];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY", "MMM D, YYYY"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FONTS = ["system-ui", "Inter", "Geist", "Roboto", "Arial", "Georgia"];
const PLANS = ["STARTER", "GROWTH", "CFO"];

const TABS = [
  { id: "identity", label: "Firm identity", icon: Building2 },
  { id: "regional", label: "Regional defaults", icon: Globe },
  { id: "markets", label: "Supported markets", icon: Map },
  { id: "plans", label: "Plans & trial", icon: CreditCard },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "email", label: "Email", icon: Mail },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "compliance", label: "SLA & compliance", icon: FileCheck },
] as const;

type TabId = typeof TABS[number]["id"];

function parseArr(json: string | undefined | null): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function FirmSettingsForm() {
  const [s, setS] = useState<FirmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("identity");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/firm-settings");
      if (!res.ok) throw new Error();
      setS(await res.json());
    } catch {
      toast.error("Could not load firm settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function set<K extends keyof FirmSettings>(key: K, value: FirmSettings[K]) {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/firm-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error();
      setS(await res.json());
      toast.success("Firm settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !s) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
      </div>
    );
  }

  const currencies = parseArr(s.supportedCurrenciesJson);
  const countries = parseArr(s.supportedCountriesJson);
  const languages = parseArr(s.supportedLanguagesJson);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <SettingsIcon className="h-3 w-3" /> firm_settings
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Firm-wide settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global configuration applied across the firm — defaults for new clients, branding, security, and service SLAs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-6">
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
          {tab === "identity" && (
            <SectionCard title="firm_identity">
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Firm name">
                    <Input value={s.firmName} onChange={(e) => set("firmName", e.target.value)} />
                  </Field>
                  <Field label="Website">
                    <Input value={s.firmWebsite ?? ""} onChange={(e) => set("firmWebsite", e.target.value)} placeholder="https://" />
                  </Field>
                  <Field label="Contact email">
                    <Input value={s.firmEmail ?? ""} onChange={(e) => set("firmEmail", e.target.value)} placeholder="hello@firm.com" />
                  </Field>
                  <Field label="Phone">
                    <Input value={s.firmPhone ?? ""} onChange={(e) => set("firmPhone", e.target.value)} />
                  </Field>
                  <Field label="Logo URL">
                    <Input value={s.firmLogoUrl ?? ""} onChange={(e) => set("firmLogoUrl", e.target.value)} placeholder="https://.../logo.png" />
                  </Field>
                  <Field label="Firm tax ID / EIN">
                    <Input value={s.firmTaxId ?? ""} onChange={(e) => set("firmTaxId", e.target.value)} />
                  </Field>
                </div>
                <Field label="Address">
                  <Textarea value={s.firmAddress ?? ""} onChange={(e) => set("firmAddress", e.target.value)} rows={3} />
                </Field>
              </div>
            </SectionCard>
          )}

          {tab === "regional" && (
            <SectionCard title="new_client_defaults">
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">Applied to every new client account at creation.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Default country">
                    <Select
                      value={s.defaultCountry}
                      onChange={(v) => {
                        const c = COUNTRIES.find((x) => x[0] === v);
                        setS((prev) => prev ? {
                          ...prev,
                          defaultCountry: v,
                          defaultCurrency: c?.[2] ?? prev.defaultCurrency,
                          defaultTimezone: c?.[3] ?? prev.defaultTimezone,
                        } : prev);
                      }}
                      options={COUNTRIES.map(([code, name]) => [code, name])}
                    />
                  </Field>
                  <Field label="Default currency">
                    <Select value={s.defaultCurrency} onChange={(v) => set("defaultCurrency", v)} options={ALL_CURRENCIES.map((c) => [c, c])} />
                  </Field>
                  <Field label="Default locale">
                    <Select value={s.defaultLocale} onChange={(v) => set("defaultLocale", v)} options={ALL_LOCALES} />
                  </Field>
                  <Field label="Default timezone">
                    <Input value={s.defaultTimezone} onChange={(e) => set("defaultTimezone", e.target.value)} />
                  </Field>
                  <Field label="Default date format">
                    <Select value={s.defaultDateFormat} onChange={(v) => set("defaultDateFormat", v)} options={DATE_FORMATS.map((f) => [f, f])} />
                  </Field>
                  <Field label="Fiscal year starts">
                    <Select value={String(s.defaultFiscalStartMonth)} onChange={(v) => set("defaultFiscalStartMonth", parseInt(v))} options={MONTHS.map((m, i) => [String(i + 1), m])} />
                  </Field>
                  <Field label="Default tax name">
                    <Input value={s.defaultTaxName} onChange={(e) => set("defaultTaxName", e.target.value)} placeholder="VAT, GST, Sales Tax..." />
                  </Field>
                  <Field label="Default tax rate (%)">
                    <Input type="number" step="0.1" value={(s.defaultTaxRate * 100).toFixed(1)} onChange={(e) => set("defaultTaxRate", (parseFloat(e.target.value) || 0) / 100)} />
                  </Field>
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "markets" && (
            <>
              <SectionCard title="supported_currencies">
                <div className="p-5">
                  <ChipPicker
                    options={ALL_CURRENCIES.map((c) => [c, c])}
                    selected={currencies}
                    onToggle={(code) => set("supportedCurrenciesJson", JSON.stringify(toggle(currencies, code)))}
                  />
                </div>
              </SectionCard>
              <SectionCard title="supported_countries">
                <div className="p-5">
                  <ChipPicker
                    options={COUNTRIES.map(([code, name]) => [code, name])}
                    selected={countries}
                    onToggle={(code) => set("supportedCountriesJson", JSON.stringify(toggle(countries, code)))}
                  />
                </div>
              </SectionCard>
              <SectionCard title="supported_languages">
                <div className="p-5">
                  <ChipPicker
                    options={ALL_LOCALES}
                    selected={languages}
                    onToggle={(code) => set("supportedLanguagesJson", JSON.stringify(toggle(languages, code)))}
                  />
                </div>
              </SectionCard>
            </>
          )}

          {tab === "plans" && (
            <SectionCard title="plans_and_trial">
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Default plan for new clients">
                    <Select value={s.defaultPlan} onChange={(v) => set("defaultPlan", v)} options={PLANS.map((p) => [p, p])} />
                  </Field>
                  <Field label="Free trial length (days)">
                    <Input type="number" value={s.trialDays} onChange={(e) => set("trialDays", parseInt(e.target.value) || 0)} />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                  New sign-ups start on the default plan with a {s.trialDays}-day free trial.
                </p>
              </div>
            </SectionCard>
          )}

          {tab === "branding" && (
            <SectionCard title="white_label_branding">
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Primary color">
                    <ColorInput value={s.brandPrimaryColor} onChange={(v) => set("brandPrimaryColor", v)} />
                  </Field>
                  <Field label="Accent color">
                    <ColorInput value={s.brandAccentColor} onChange={(v) => set("brandAccentColor", v)} />
                  </Field>
                  <Field label="Font">
                    <Select value={s.brandFont} onChange={(v) => set("brandFont", v)} options={FONTS.map((f) => [f, f])} />
                  </Field>
                  <Field label="Custom domain">
                    <Input value={s.customDomain ?? ""} onChange={(e) => set("customDomain", e.target.value)} placeholder="books.yourfirm.com" />
                  </Field>
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "email" && (
            <SectionCard title="outbound_email">
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sender name">
                    <Input value={s.emailSenderName} onChange={(e) => set("emailSenderName", e.target.value)} />
                  </Field>
                  <Field label="Reply-to address">
                    <Input value={s.emailReplyTo ?? ""} onChange={(e) => set("emailReplyTo", e.target.value)} placeholder="support@firm.com" />
                  </Field>
                </div>
                <Field label="Default email signature">
                  <Textarea value={s.emailSignature ?? ""} onChange={(e) => set("emailSignature", e.target.value)} rows={4} placeholder="The Ledgr team" />
                </Field>
              </div>
            </SectionCard>
          )}

          {tab === "security" && (
            <SectionCard title="security_policy">
              <div className="p-5 space-y-1">
                <Toggle label="Enforce two-factor auth" desc="Require all users (clients and staff) to enable 2FA" checked={s.enforceTwoFactor} onChange={(v) => set("enforceTwoFactor", v)} />
                <Toggle label="Single sign-on (SSO)" desc="Allow login via an external identity provider" checked={s.ssoEnabled} onChange={(v) => set("ssoEnabled", v)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  {s.ssoEnabled && (
                    <Field label="SSO provider">
                      <Input value={s.ssoProvider ?? ""} onChange={(e) => set("ssoProvider", e.target.value)} placeholder="okta, azure-ad, google..." />
                    </Field>
                  )}
                  <Field label="Session timeout (minutes)">
                    <Input type="number" value={s.sessionTimeoutMinutes} onChange={(e) => set("sessionTimeoutMinutes", parseInt(e.target.value) || 0)} />
                  </Field>
                  <Field label="Minimum password length">
                    <Input type="number" value={s.passwordMinLength} onChange={(e) => set("passwordMinLength", parseInt(e.target.value) || 0)} />
                  </Field>
                </div>
                <Field label="IP allowlist (one per line, blank = allow all)">
                  <Textarea
                    value={parseArr(s.ipAllowlistJson).join("\n")}
                    onChange={(e) => set("ipAllowlistJson", JSON.stringify(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean)))}
                    rows={3}
                    placeholder="203.0.113.5&#10;198.51.100.0/24"
                  />
                </Field>
              </div>
            </SectionCard>
          )}

          {tab === "notifications" && (
            <SectionCard title="operator_notifications">
              <div className="p-5 space-y-1">
                <Toggle label="New client signups" desc="Notify the firm when a new client account is created" checked={s.notifyOnNewClient} onChange={(v) => set("notifyOnNewClient", v)} />
                <Toggle label="Anomaly flags" desc="Notify when the system flags unusual transactions" checked={s.notifyOnAnomaly} onChange={(v) => set("notifyOnAnomaly", v)} />
                <Toggle label="Large transactions" desc="Notify when a transaction exceeds the threshold below" checked={s.notifyOnLargeTxn} onChange={(v) => set("notifyOnLargeTxn", v)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <Field label="Large-transaction threshold">
                    <Input type="number" value={s.largeTxnThreshold} onChange={(e) => set("largeTxnThreshold", parseFloat(e.target.value) || 0)} />
                  </Field>
                  <Field label="Digest frequency">
                    <Select value={s.digestFrequency} onChange={(v) => set("digestFrequency", v)} options={[["DAILY", "Daily"], ["WEEKLY", "Weekly"], ["NEVER", "Never"]]} />
                  </Field>
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "compliance" && (
            <>
              <SectionCard title="service_sla">
                <div className="p-5 space-y-4">
                  <p className="text-xs text-muted-foreground">Response-time promises shown to clients, in hours, per plan.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Starter SLA (hours)">
                      <Input type="number" value={s.responseSlaStarter} onChange={(e) => set("responseSlaStarter", parseInt(e.target.value) || 0)} />
                    </Field>
                    <Field label="Growth SLA (hours)">
                      <Input type="number" value={s.responseSlaGrowth} onChange={(e) => set("responseSlaGrowth", parseInt(e.target.value) || 0)} />
                    </Field>
                    <Field label="CFO SLA (hours)">
                      <Input type="number" value={s.responseSlaCfo} onChange={(e) => set("responseSlaCfo", parseInt(e.target.value) || 0)} />
                    </Field>
                  </div>
                  <Field label="Monthly close delivered by (day of month)">
                    <Input type="number" min={1} max={28} value={s.closeDayOfMonth} onChange={(e) => set("closeDayOfMonth", parseInt(e.target.value) || 1)} />
                  </Field>
                </div>
              </SectionCard>
              <SectionCard title="compliance">
                <div className="p-5">
                  <Field label="Audit log retention (days)">
                    <Input type="number" value={s.auditRetentionDays} onChange={(e) => set("auditRetentionDays", parseInt(e.target.value) || 0)} />
                  </Field>
                </div>
              </SectionCard>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving…</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save changes</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ── */

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 border border-input bg-background rounded-md px-3 text-sm"
    >
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-md border border-input bg-background cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
    </div>
  );
}

function ChipPicker({ options, selected, onToggle }: { options: string[][]; selected: string[]; onToggle: (code: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([code, label]) => {
        const on = selected.includes(code);
        return (
          <button
            key={code}
            onClick={() => onToggle(code)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              on
                ? "border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-400"
                : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
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
