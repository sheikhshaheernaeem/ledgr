"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff, Loader2, QrCode } from "lucide-react";

export default function TwoFASettings({ enabled }: { enabled: boolean }) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(enabled);
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setQrCode(data.qrCode); setSecret(data.secret); setStep("setup"); }
    else toast.error(data.error ?? "Failed to start 2FA setup");
  }

  async function verifyAndEnable() {
    if (code.length < 6) return;
    setLoading(true);
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, secret }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      toast.success("2FA enabled successfully");
      setIs2FAEnabled(true);
      setStep("idle");
      setQrCode(""); setSecret(""); setCode("");
    } else {
      toast.error(data.error ?? "Invalid code");
    }
  }

  async function disable2FA() {
    if (!confirm("Are you sure you want to disable 2FA? This reduces your account security.")) return;
    setLoading(true);
    const res = await fetch("/api/auth/2fa/disable", { method: "POST" });
    setLoading(false);
    if (res.ok) { toast.success("2FA disabled"); setIs2FAEnabled(false); }
    else toast.error("Failed to disable 2FA");
  }

  if (is2FAEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <ShieldCheck className="h-3 w-3 mr-1" /> Enabled
          </Badge>
          <span className="text-sm text-muted-foreground">Your account is protected with 2FA</span>
        </div>
        <Button onClick={disable2FA} disabled={loading} variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
          Disable 2FA
        </Button>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Two-factor authentication adds a second step when signing in using an authenticator app (Google Authenticator, Authy, etc.).
        </p>
        <Button onClick={startSetup} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Enable 2FA
        </Button>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code to verify.</p>
        {qrCode && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-border rounded-lg bg-white p-2" />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" /> Manual entry key</Label>
          <code className="block text-xs font-mono bg-muted px-3 py-2 rounded break-all">{secret}</code>
        </div>
        <Button onClick={() => setStep("verify")} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
          I&apos;ve scanned it — Enter Code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to confirm setup.</p>
      <div className="space-y-2">
        <Label>Verification Code</Label>
        <Input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={e => e.key === "Enter" && verifyAndEnable()}
          placeholder="000000"
          className="text-center text-xl tracking-widest font-mono"
          maxLength={6}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={verifyAndEnable} disabled={loading || code.length < 6} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Verify & Enable
        </Button>
        <Button onClick={() => { setStep("idle"); setQrCode(""); setSecret(""); setCode(""); }} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
}
