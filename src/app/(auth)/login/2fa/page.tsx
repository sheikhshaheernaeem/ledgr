"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";

function TwoFAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (code.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      toast.success("Verified");
      router.push(callbackUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication Code</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={e => e.key === "Enter" && verify()}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono h-12"
              autoFocus
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground text-center">
              If you lost access to your app, use one of your backup codes
            </p>
          </div>
          <Button
            onClick={verify}
            disabled={loading || code.length < 6}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verify
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TwoFAPage() {
  return (
    <Suspense>
      <TwoFAForm />
    </Suspense>
  );
}
