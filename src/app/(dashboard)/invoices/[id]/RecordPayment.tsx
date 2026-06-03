"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Props {
  invoiceId: string;
  total: number;
  amountPaid: number;
}

export default function RecordPayment({ invoiceId, total, amountPaid }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(amountPaid > 0 ? String(amountPaid) : "");
  const [saving, setSaving] = useState(false);

  const balanceDue = total - amountPaid;

  async function handleRecord() {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid: val }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment recorded");
      router.refresh();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount paid"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={handleRecord}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record"}
        </Button>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Amount Paid: <span className="text-white font-medium">${amountPaid.toFixed(2)}</span>
        </span>
        <span className="text-muted-foreground">
          Balance Due:{" "}
          <span className={balanceDue <= 0 ? "text-emerald-400 font-medium" : "text-white font-medium"}>
            ${Math.max(0, balanceDue).toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
