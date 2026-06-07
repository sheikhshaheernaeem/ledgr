"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, X, Link, Building2, Palette, Globe } from "lucide-react";
import { COUNTRY_LIST, COUNTRIES } from "@/lib/countries";

export default function SettingsForm({
  initialName,
  email,
  initialPaymentLink,
  initialCustomCategories,
  initialCompanyName,
  initialCompanyAddress,
  initialCompanyLogo,
  initialRevenueGoal,
  initialInvoiceBrandColor,
  initialInvoiceFooterText,
  initialCountry,
  initialCurrency,
  initialLocale,
  initialTimezone,
  initialTaxName,
  initialDefaultTaxRate,
}: {
  initialName: string;
  email: string;
  initialPaymentLink: string;
  initialCustomCategories: string[];
  initialCompanyName: string;
  initialCompanyAddress: string;
  initialCompanyLogo: string;
  initialRevenueGoal: number | null;
  initialInvoiceBrandColor: string;
  initialInvoiceFooterText: string;
  initialCountry: string;
  initialCurrency: string;
  initialLocale: string;
  initialTimezone: string;
  initialTaxName: string;
  initialDefaultTaxRate: number;
}) {
  const [name, setName] = useState(initialName);
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink);
  const [customCategories, setCustomCategories] = useState<string[]>(initialCustomCategories);
  const [newCategory, setNewCategory] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Company profile state
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [companyAddress, setCompanyAddress] = useState(initialCompanyAddress);
  const [companyLogo, setCompanyLogo] = useState(initialCompanyLogo);
  const [revenueGoal, setRevenueGoal] = useState(initialRevenueGoal !== null ? String(initialRevenueGoal) : "");
  const [savingCompany, setSavingCompany] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Invoice branding state
  const [invoiceBrandColor, setInvoiceBrandColor] = useState(initialInvoiceBrandColor || "#10b981");
  const [invoiceFooterText, setInvoiceFooterText] = useState(initialInvoiceFooterText);
  const [savingBranding, setSavingBranding] = useState(false);

  // Region & locale state
  const [country, setCountry] = useState(initialCountry);
  const [currency, setCurrency] = useState(initialCurrency);
  const [locale, setLocale] = useState(initialLocale);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [taxName, setTaxName] = useState(initialTaxName);
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(initialDefaultTaxRate));
  const [savingLocale, setSavingLocale] = useState(false);

  function handleCountryChange(code: string | null) {
    if (!code) return;
    setCountry(code);
    const cfg = COUNTRIES[code];
    if (cfg) {
      setCurrency(cfg.currency);
      setLocale(cfg.locale);
      setTimezone(cfg.timezone);
      setTaxName(cfg.taxName);
      setDefaultTaxRate(String(cfg.defaultTaxRate));
    }
  }

  async function saveLocale() {
    setSavingLocale(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, currency, locale, timezone, taxName, defaultTaxRate: parseFloat(defaultTaxRate) || 0 }),
    });
    if (res.ok) {
      toast.success("Region settings saved — reload the page to see updated formatting");
      window.location.reload();
    } else {
      toast.error("Failed to save region settings");
    }
    setSavingLocale(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCompanyLogo((ev.target?.result as string) ?? "");
    };
    reader.readAsDataURL(file);
  }

  async function saveCompanyProfile() {
    setSavingCompany(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: companyName || null,
        companyAddress: companyAddress || null,
        companyLogo: companyLogo || null,
        revenueGoal: revenueGoal ? parseFloat(revenueGoal) : null,
      }),
    });
    if (res.ok) toast.success("Company profile saved");
    else toast.error("Failed to save company profile");
    setSavingCompany(false);
  }

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, paymentLink: paymentLink || null }),
    });
    if (res.ok) toast.success("Profile updated");
    else toast.error("Failed to update profile");
    setSaving(false);
  }

  async function saveCategories() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customCategories }),
    });
    if (res.ok) toast.success("Categories saved");
    else toast.error("Failed to save categories");
    setSaving(false);
  }

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || customCategories.includes(trimmed)) return;
    setCustomCategories(prev => [...prev, trimmed]);
    setNewCategory("");
  }

  function removeCategory(cat: string) {
    setCustomCategories(prev => prev.filter(c => c !== cat));
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to change password");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Region & Currency */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Globe className="h-4 w-4" /> Region &amp; Currency</h3>
          <p className="text-xs text-muted-foreground mt-1">Controls currency symbol, date format, number format, and default tax rate across all reports and invoices</p>
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COUNTRY_LIST.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} placeholder="USD" maxLength={3} />
          </div>
          <div className="space-y-2">
            <Label>Tax Label</Label>
            <Input value={taxName} onChange={e => setTaxName(e.target.value)} placeholder="VAT" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Default Tax Rate (%)</Label>
            <Input type="number" min="0" max="100" step="0.1" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="America/New_York" />
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Preview with current settings:</p>
          <p>Currency: {new Intl.NumberFormat(locale, { style: "currency", currency: currency || "USD" }).format(12345.67)}</p>
          <p>Date: {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</p>
          <p>Tax: {taxName || "Tax"} @ {defaultTaxRate}%</p>
        </div>
        <Button onClick={saveLocale} disabled={savingLocale} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {savingLocale ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Region Settings
        </Button>
      </div>

      <Separator />

      {/* Company Profile */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Company Profile</h3>
          <p className="text-xs text-muted-foreground mt-1">Shown on invoices and quotes</p>
        </div>
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." />
        </div>
        <div className="space-y-2">
          <Label>Company Address</Label>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            rows={2}
            placeholder="123 Main St, City, State 00000"
            value={companyAddress}
            onChange={e => setCompanyAddress(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            {companyLogo && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={companyLogo} alt="Company logo" className="h-12 w-auto rounded border border-border object-contain" />
                <button
                  type="button"
                  onClick={() => { setCompanyLogo(""); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                  className="absolute -top-2 -right-2 bg-destructive text-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
              {companyLogo ? "Change Logo" : "Upload Logo"}
            </Button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG, SVG. Stored as base64 — keep under 200 KB.</p>
        </div>
        <div className="space-y-2">
          <Label>Monthly Revenue Goal (USD)</Label>
          <Input
            type="number"
            min="0"
            step="100"
            placeholder="10000"
            value={revenueGoal}
            onChange={e => setRevenueGoal(e.target.value)}
          />
        </div>
        <Button onClick={saveCompanyProfile} disabled={savingCompany} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Company Profile
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Link className="h-3.5 w-3.5" /> Payment Link</Label>
          <Input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://buymeacoffee.com/yourname" />
          <p className="text-xs text-muted-foreground">Shown on invoices so clients can pay you directly (Buy Me a Coffee, PayPal, etc.)</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Custom Categories</h3>
          <p className="text-xs text-muted-foreground mt-1">Add custom transaction categories beyond the defaults</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customCategories.map(cat => (
            <Badge key={cat} variant="outline" className="gap-1 pr-1 text-xs">
              {cat}
              <button onClick={() => removeCategory(cat)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {customCategories.length === 0 && <p className="text-xs text-muted-foreground">No custom categories yet</p>}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            placeholder="New category name"
            className="max-w-xs"
          />
          <Button onClick={addCategory} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        <Button onClick={saveCategories} disabled={saving} variant="outline" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Categories
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <Button onClick={changePassword} disabled={saving || !currentPassword || !newPassword} variant="outline" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Password
        </Button>
      </div>
    </div>
  );
}
