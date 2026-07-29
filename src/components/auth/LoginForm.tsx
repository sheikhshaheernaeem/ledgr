"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, Mail, Eye, EyeOff } from "lucide-react";
import { useMode } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";

const FAMILY_HOME: Record<Family, string> = { ai: "/ai/client", bookkeeping: "/bookkeeping/client" };
const FAMILY_LABEL: Record<Family, string> = { ai: "AI Accountant", bookkeeping: "Book keeping" };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "1";
  const justLinked = params.get("justLinked") === "1";
  const { mode } = useMode();
  const isAi = mode === "ai";
  const brandText = isAi ? "text-cyan-600 dark:text-cyan-400" : "text-emerald-600 dark:text-emerald-400";
  const brandHoverText = isAi ? "hover:text-cyan-600 dark:hover:text-cyan-400" : "hover:text-emerald-600 dark:hover:text-emerald-400";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: params.get("email") ?? "", password: "" });
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
        } else if (sessionData?.user?.role === "ACCOUNTANT" || sessionData?.user?.role === "QA") {
          router.push("/firm/queue");
        } else {
          // CLIENT: land on whichever product(s) they actually hold —
          // never dump a Book-keeping-only subscriber on the AI home.
          const famRes = await fetch("/api/me/families");
          const famData = famRes.ok ? await famRes.json() : null;
          const families: Family[] = famData?.families ?? [];
          if (families.length === 1) {
            router.push(FAMILY_HOME[families[0]]);
          } else if (families.length === 2) {
            router.push(FAMILY_HOME[mode]);
          } else {
            router.push("/client");
          }
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
        <Link href={`/${mode}`}>
          <span className={`text-2xl font-bold tracking-tight ${brandText}`}>Ledgr</span>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
      </div>

      <div className="flex justify-center">
        <Badge
          variant="outline"
          className={isAi ? "border-cyan-500/30 text-cyan-400" : "border-emerald-500/30 text-emerald-400"}
        >
          {FAMILY_LABEL[mode]}
        </Badge>
      </div>

      {justLinked && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">The other plan is now on your account — sign in to see both.</p>
        </div>
      )}

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
          <CardDescription>
            {isAi ? "Sign in to your AI Accountant dashboard" : "Sign in to your bookkeeping dashboard"}
          </CardDescription>
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
                <Link href="/forgot-password" className={`text-xs text-muted-foreground transition-colors ${brandHoverText}`}>
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
              className={`w-full font-semibold text-white ${
                isAi
                  ? "bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400"
                  : "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              }`}
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
        <Link href={`/${mode}/register`} className={brandText}>
          Sign up free
        </Link>
      </p>
    </div>
  );
}
