"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Send, ThumbsUp, ThumbsDown } from "lucide-react";

export default function EstimateDetailActions({
  estimateId,
  status,
}: {
  estimateId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(s: string) {
    setLoading(s);
    const res = await fetch(`/api/estimates/${estimateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (res.ok) {
      toast.success(`Marked as ${s.toLowerCase()}`);
      router.refresh();
    } else {
      toast.error("Update failed");
    }
    setLoading(null);
  }

  async function convertToInvoice() {
    setLoading("convert");
    const res = await fetch(`/api/estimates/${estimateId}/convert`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Converted to invoice successfully");
      router.push(`/invoices/${data.invoiceId}`);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Conversion failed");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("SENT")}
          disabled={loading !== null}
          className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:text-cyan-300"
        >
          {loading === "SENT" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Send
        </Button>
      )}
      {status === "SENT" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus("ACCEPTED")}
            disabled={loading !== null}
            className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:text-emerald-300"
          >
            {loading === "ACCEPTED" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ThumbsUp className="h-3 w-3" />
            )}
            Mark Accepted
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus("DECLINED")}
            disabled={loading !== null}
            className="gap-1.5 border-red-500/30 text-red-400 hover:text-red-300"
          >
            {loading === "DECLINED" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ThumbsDown className="h-3 w-3" />
            )}
            Mark Declined
          </Button>
        </>
      )}
      {status === "ACCEPTED" && (
        <Button
          size="sm"
          onClick={convertToInvoice}
          disabled={loading !== null}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
        >
          {loading === "convert" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          Convert to Invoice
        </Button>
      )}
    </div>
  );
}
