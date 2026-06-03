"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ReconciliationActions({ reconciliationId }: { reconciliationId: string }) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  async function complete() {
    setCompleting(true);
    const res = await fetch(`/api/reconciliation/${reconciliationId}/complete`, { method: "POST" });
    if (res.ok) { toast.success("Reconciliation completed"); router.refresh(); }
    else toast.error("Failed to complete");
    setCompleting(false);
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      <p className="text-sm text-emerald-300 flex-1">Your accounts are balanced! Mark this reconciliation as complete.</p>
      <Button onClick={complete} disabled={completing} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
        {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Mark Complete
      </Button>
    </div>
  );
}
