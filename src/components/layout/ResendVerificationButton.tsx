"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ResendVerificationButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    if (sent) return;
    setLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success("Verification email sent — check your inbox");
    } catch {
      toast.error("Failed to send — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={resend}
      disabled={loading || sent}
      className="shrink-0 text-xs font-medium underline underline-offset-2 hover:text-yellow-300 disabled:opacity-50 disabled:no-underline transition-colors"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : sent ? "Email sent ✓" : "Resend email"}
    </button>
  );
}
