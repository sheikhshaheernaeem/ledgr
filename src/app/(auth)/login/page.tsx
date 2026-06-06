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
import { Loader2, CheckCircle2, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "1";

  const [loading, setLoading] = useState(false);
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
        router.push("/dashboard");
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
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">Ledgr</span>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
      </div>

      {verified && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400 font-medium">Email verified! You can now sign in.</p>
        </div>
      )}

      {unverified && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-400 font-medium">Please verify your email first</p>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Check your inbox for the confirmation link.{" "}
            <Link
              href={`/check-email?email=${encodeURIComponent(form.email)}`}
              className="text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
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
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300">
          Sign up free
        </Link>
      </p>
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
