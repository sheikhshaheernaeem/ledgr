"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Loader2, CheckCircle2, Eye, EyeOff, XCircle } from "lucide-react";

// Common domain typo map
const DOMAIN_TYPOS: Record<string, string> = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmailo.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.co": "yahoo.com",
  "yahooo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmall.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloook.com": "outlook.com",
  "outook.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.con": "icloud.com",
};

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function validateEmail(email: string): {
  valid: boolean;
  error?: string;
  suggestion?: string;
} {
  if (!email) return { valid: false };

  if (!email.includes("@"))
    return { valid: false, error: "Must include @" };

  const [local, domain] = email.split("@");
  if (!local) return { valid: false, error: "Enter something before @" };
  if (!domain || !domain.includes("."))
    return { valid: false, error: "Domain must contain a dot (e.g. gmail.com)" };

  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2)
    return { valid: false, error: "Invalid domain extension" };

  if (!EMAIL_RE.test(email))
    return { valid: false, error: "Invalid email format" };

  const domainLower = domain.toLowerCase();
  if (DOMAIN_TYPOS[domainLower]) {
    const fixed = `${local}@${DOMAIN_TYPOS[domainLower]}`;
    return { valid: false, error: `Did you mean ${fixed}?`, suggestion: fixed };
  }

  return { valid: true };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [emailTouched, setEmailTouched] = useState(false);

  const emailStatus = useMemo(() => validateEmail(form.email), [form.email]);
  const showEmailError = emailTouched && form.email.length > 0 && !emailStatus.valid;
  const showEmailOk = form.email.length > 0 && emailStatus.valid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);

    if (!emailStatus.valid) {
      toast.error(emailStatus.error ?? "Please enter a valid email address");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Registration failed");
      } else {
        router.push(`/check-email?email=${encodeURIComponent(form.email)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            Ledgr
          </span>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">
          Create your free account
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Get started for free</CardTitle>
          <CardDescription>First month completely free. No credit card required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business / Your Name</Label>
              <Input
                id="name"
                placeholder="Acme Store"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onBlur={() => setEmailTouched(true)}
                  className={
                    showEmailError
                      ? "border-red-500 focus-visible:ring-red-500 pr-10"
                      : showEmailOk
                      ? "border-emerald-500 focus-visible:ring-emerald-500 pr-10"
                      : "pr-10"
                  }
                  required
                />
                {showEmailOk && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 pointer-events-none" />
                )}
                {showEmailError && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none" />
                )}
              </div>
              {showEmailError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  {emailStatus.error}
                  {emailStatus.suggestion && (
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => {
                        setForm({ ...form, email: emailStatus.suggestion! });
                      }}
                    >
                      Use this
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
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
              Create Free Account
            </Button>
          </form>

          <ul className="mt-4 space-y-1">
            {[
              "First month free",
              "No credit card required",
              "Cancel anytime",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
