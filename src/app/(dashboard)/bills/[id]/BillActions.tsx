"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCheck } from "lucide-react";

export default function BillActions({
  billId,
  status,
}: {
  billId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(s: string) {
    setLoading(s);
    const res = await fetch(`/api/bills/${billId}/status`, {
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

  if (status !== "PENDING" && status !== "OVERDUE") return null;

  return (
    <Button
      size="sm"
      onClick={() => updateStatus("PAID")}
      disabled={loading === "PAID"}
      className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
    >
      {loading === "PAID" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCheck className="h-3.5 w-3.5" />
      )}
      Mark as Paid
    </Button>
  );
}
