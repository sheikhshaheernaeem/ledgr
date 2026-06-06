"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";

function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      toast.success("Verification email sent!");
    } catch {
      toast.error("Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Ledgr</span>
        </Link>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">Check your inbox</h1>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a confirmation link to
            </p>
            {email && (
              <p className="text-sm font-medium text-foreground mt-1">{email}</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>

          <div className="space-y-2 pt-2">
            {resent ? (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Email resent successfully
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border"
                onClick={handleResend}
                disabled={resending || !email}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending…" : "Resend email"}
              </Button>
            )}

            <div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <button onClick={handleResend} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline underline-offset-2">
          request a new link
        </button>
      </p>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
