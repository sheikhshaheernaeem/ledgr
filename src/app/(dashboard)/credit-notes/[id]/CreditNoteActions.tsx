"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CreditNoteActions({ creditNoteId, status, relatedInvoiceId }: { creditNoteId: string; status: string; relatedInvoiceId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function patch(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/credit-notes/${creditNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Credit note marked as ${newStatus.toLowerCase()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/credit-notes/${creditNoteId}/apply`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Credit note applied to invoice");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button size="sm" onClick={() => patch("ISSUED")} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-black">
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Issue
        </Button>
      )}
      {status === "ISSUED" && relatedInvoiceId && (
        <Button size="sm" onClick={apply} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Apply to Invoice
        </Button>
      )}
    </div>
  );
}
