"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Eye, Palette, Globe, Mail, Building2 } from "lucide-react";

interface WhiteLabelConfig {
  brandName: string | null;
  logo: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  supportEmail: string | null;
  footerText: string | null;
  faviconUrl: string | null;
}

export default function WhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>({
    brandName: "",
    logo: "",
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
    customDomain: "",
    supportEmail: "",
    footerText: "",
    faviconUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch("/api/white-label")
      .then(res => res.json())
      .then(data => {
        if (data) setConfig(c => ({
          brandName: data.brandName ?? c.brandName,
          logo: data.logo ?? c.logo,
          primaryColor: data.primaryColor ?? c.primaryColor,
          accentColor: data.accentColor ?? c.accentColor,
          customDomain: data.customDomain ?? c.customDomain,
          supportEmail: data.supportEmail ?? c.supportEmail,
          footerText: data.footerText ?? c.footerText,
          faviconUrl: data.faviconUrl ?? c.faviconUrl,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/white-label", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("White-label settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">White-Label Settings</h1>
          <p className="text-muted-foreground">Customize branding for your client-facing portals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-2">
            <Eye className="h-4 w-4" />{showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        {/* Configuration */}
        <div className="space-y-6">
          {/* Brand */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Brand Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Brand Name</Label>
                <Input
                  value={config.brandName ?? ""}
                  onChange={e => setConfig(c => ({ ...c, brandName: e.target.value }))}
                  placeholder="Acme Accounting"
                />
                <p className="text-xs text-muted-foreground">Replaces "Ledgr" in client-facing portals</p>
              </div>
              <div className="space-y-1">
                <Label>Logo URL</Label>
                <Input
                  value={config.logo ?? ""}
                  onChange={e => setConfig(c => ({ ...c, logo: e.target.value }))}
                  placeholder="https://yourcompany.com/logo.png"
                />
              </div>
              <div className="space-y-1">
                <Label>Favicon URL</Label>
                <Input
                  value={config.faviconUrl ?? ""}
                  onChange={e => setConfig(c => ({ ...c, faviconUrl: e.target.value }))}
                  placeholder="https://yourcompany.com/favicon.ico"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" />Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.primaryColor ?? "#6366f1"}
                      onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                      className="h-9 w-12 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={config.primaryColor ?? ""}
                      onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                      placeholder="#6366f1"
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Buttons, links, highlights</p>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.accentColor ?? "#8b5cf6"}
                      onChange={e => setConfig(c => ({ ...c, accentColor: e.target.value }))}
                      className="h-9 w-12 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={config.accentColor ?? ""}
                      onChange={e => setConfig(c => ({ ...c, accentColor: e.target.value }))}
                      placeholder="#8b5cf6"
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Secondary highlights, badges</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(color => (
                  <button
                    key={color}
                    onClick={() => setConfig(c => ({ ...c, primaryColor: color }))}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${config.primaryColor === color ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Domain & Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4" />Domain & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Custom Domain</Label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border border-r-0 rounded-l-md">https://</span>
                  <Input
                    value={config.customDomain ?? ""}
                    onChange={e => setConfig(c => ({ ...c, customDomain: e.target.value }))}
                    placeholder="app.yourcompany.com"
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Point your domain's CNAME to ledgr.app</p>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Support Email</Label>
                <Input
                  type="email"
                  value={config.supportEmail ?? ""}
                  onChange={e => setConfig(c => ({ ...c, supportEmail: e.target.value }))}
                  placeholder="support@yourcompany.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Footer Text</Label>
                <Input
                  value={config.footerText ?? ""}
                  onChange={e => setConfig(c => ({ ...c, footerText: e.target.value }))}
                  placeholder="© 2026 Acme Accounting. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</h2>
            <div className="border rounded-xl overflow-hidden shadow-lg">
              {/* Mock portal header */}
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ backgroundColor: config.primaryColor ?? "#6366f1" }}
              >
                {config.logo ? (
                  <img src={config.logo} alt="Logo" className="h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {(config.brandName || "L").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white font-semibold text-lg">{config.brandName || "Ledgr"}</span>
              </div>

              {/* Mock portal content */}
              <div className="p-6 bg-muted/30 space-y-4">
                <div className="bg-background rounded-lg p-4 border">
                  <h3 className="font-semibold text-sm mb-1">Submit Your Bill</h3>
                  <p className="text-xs text-muted-foreground">Welcome, Vendor Name. Please submit your invoice below.</p>
                  <div className="mt-3 space-y-2">
                    <div className="h-8 bg-muted rounded-md" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 bg-muted rounded-md" />
                      <div className="h-8 bg-muted rounded-md" />
                    </div>
                    <button
                      className="w-full py-2 rounded-md text-white text-sm font-medium"
                      style={{ backgroundColor: config.primaryColor ?? "#6366f1" }}
                    >
                      Submit Bill
                    </button>
                  </div>
                </div>

                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: config.accentColor ?? "#8b5cf6" }}
                    />
                    <span className="text-xs font-medium">Invoice #INV-0042</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Amount Due</span>
                    <span className="text-sm font-bold">$2,500.00</span>
                  </div>
                  <button
                    className="mt-2 w-full py-1.5 rounded text-white text-xs font-medium"
                    style={{ backgroundColor: config.accentColor ?? "#8b5cf6" }}
                  >
                    Pay Now
                  </button>
                </div>
              </div>

              {/* Mock footer */}
              <div className="px-6 py-3 bg-background border-t text-center">
                <p className="text-xs text-muted-foreground">
                  {config.footerText || `Powered by ${config.brandName || "Ledgr"}`}
                </p>
                {config.supportEmail && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Support: <span style={{ color: config.primaryColor ?? "#6366f1" }}>{config.supportEmail}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Color swatches */}
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded border" style={{ backgroundColor: config.primaryColor ?? "#6366f1" }} />
                <span className="text-muted-foreground">Primary: {config.primaryColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded border" style={{ backgroundColor: config.accentColor ?? "#8b5cf6" }} />
                <span className="text-muted-foreground">Accent: {config.accentColor}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
