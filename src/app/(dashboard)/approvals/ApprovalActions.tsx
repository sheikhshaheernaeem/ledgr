"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ApprovalActionsProps {
  transactionId: string;
}

export function ApprovalActions({ transactionId }: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleAction(action: "APPROVE" | "REJECT") {
    setLoading(action === "APPROVE" ? "approve" : "reject");
    try {
      const body: Record<string, unknown> = { ids: [transactionId], action };
      if (action === "REJECT" && reason.trim()) {
        body.rejectionReason = reason.trim();
      }
      await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null || isPending;

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <Textarea
        placeholder="Rejection reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="text-xs h-14 resize-none"
        disabled={busy}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
          onClick={() => handleAction("APPROVE")}
          disabled={busy}
        >
          {loading === "approve" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
          onClick={() => handleAction("REJECT")}
          disabled={busy}
        >
          {loading === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}
