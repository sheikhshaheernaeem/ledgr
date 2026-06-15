"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, Mail, Eye, EyeOff, Sparkles, FileText, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "1";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [unverified, setUnverified] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUnverified(false);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("EMAIL_NOT_VERIFIED")) {
          setUnverified(true);
        } else {
          toast.error("Invalid email or password");
        }
      } else {
        // Check role and 2FA to route correctly
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
        if (sessionData?.user?.requiresTwoFactor) {
          router.push("/login/2fa");
        } else if (sessionData?.user?.role === "ADMIN") {
          router.push("/admin");
        } else if (sessionData?.user?.role === "ACCOUNTANT") {
          router.push("/firm/queue");
        } else {
          router.push("/client");
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Ledgr</span>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
      </div>

      {verified && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Email verified! You can now sign in.</p>
        </div>
      )}

      {unverified && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Please verify your email first</p>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Check your inbox for the confirmation link.{" "}
            <Link
              href={`/check-email?email=${encodeURIComponent(form.email)}`}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 underline underline-offset-2"
            >
              Resend email
            </Link>
          </p>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300">
          Sign up free
        </Link>
      </p>

      {/* Tier entry points — for visitors hitting login first */}
      <div className="rounded-xl border border-border/60 bg-card/30 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center mb-2">
          new_to_ledgr · choose_your_service
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/register?plan=ai-starter"
            className="rounded-lg border border-blue-500/30 bg-blue-500/[0.04] hover:bg-blue-500/[0.10] hover:border-blue-500/50 transition-all p-3 group"
          >
            <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400 mb-1.5" />
            <p className="text-sm font-semibold text-foreground">AI Accountant</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Starter → Autonomous · $999–$2,999</p>
            <p className="text-[10px] font-mono text-blue-500 mt-1.5 inline-flex items-center gap-0.5">
              start_free <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </Link>
          <Link
            href="/register?plan=starter"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.10] hover:border-emerald-500/50 transition-all p-3 group"
          >
            <FileText className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mb-1.5" />
            <p className="text-sm font-semibold text-foreground">Book keeping</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Basic → Advanced · $299–$1,499</p>
            <p className="text-[10px] font-mono text-emerald-500 mt-1.5 inline-flex items-center gap-0.5">
              start_free <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
