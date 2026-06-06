"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

export function AdminVerifyButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function verify() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Email marked as verified");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={verify}
      disabled={loading}
      title="Mark email as verified"
      className="inline-flex items-center justify-center rounded-md border border-yellow-500/30 bg-background text-yellow-400 hover:bg-yellow-500/10 px-2.5 py-1.5 text-xs font-medium disabled:pointer-events-none disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MailCheck className="h-3 w-3" />}
    </button>
  );
}
