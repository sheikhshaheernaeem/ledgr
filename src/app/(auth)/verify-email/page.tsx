"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const error = params.get("error");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    error ? "error" : token ? "verifying" : "error"
  );
  const [errorType, setErrorType] = useState(error ?? "");

  useEffect(() => {
    if (!token || error) return;

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        if (res.redirected) {
          const url = new URL(res.url);
          const e = url.searchParams.get("error");
          const verified = url.searchParams.get("verified");
          if (verified === "1") {
            setStatus("success");
            setTimeout(() => router.push("/login?verified=1"), 2500);
          } else if (e) {
            setErrorType(e);
            setStatus("error");
          }
        }
      })
      .catch(() => { setStatus("error"); setErrorType("unknown"); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Actually the verify endpoint does a server-side redirect — handle via direct navigation
  useEffect(() => {
    if (token && !error) {
      // Navigate directly; the API route will redirect back with result params
      router.replace(`/api/auth/verify-email?token=${token}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessages: Record<string, string> = {
    expired: "This verification link has expired. Please request a new one.",
    invalid: "This verification link is invalid or has already been used.",
    missing: "No verification token was provided.",
    unknown: "Something went wrong. Please try again.",
  };

  if (status === "verifying" || (token && !error)) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Link href="/"><span className="text-2xl font-bold text-emerald-400 tracking-tight">Ledgr</span></Link>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === "expired" || errorType === "expired" || errorType === "invalid" || errorType === "missing" || errorType === "unknown") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Link href="/"><span className="text-2xl font-bold text-emerald-400 tracking-tight">Ledgr</span></Link>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Verification failed</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                {errorMessages[errorType] ?? errorMessages.unknown}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-center pt-2">
              <Link href="/check-email">
                <Button size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                  <Mail className="h-3.5 w-3.5" /> Request new link
                </Button>
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/"><span className="text-2xl font-bold text-emerald-400 tracking-tight">Ledgr</span></Link>
      </div>
      <Card className="border-border bg-card">
        <CardContent className="pt-10 pb-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Email verified!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account is now active. Redirecting to sign in…
            </p>
          </div>
          <Link href="/login">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              Sign in now
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
