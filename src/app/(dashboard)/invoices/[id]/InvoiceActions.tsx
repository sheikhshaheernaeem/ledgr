"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, Loader2 } from "lucide-react";

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(s: string) {
    setLoading(s);
    const res = await fetch(`/api/invoices/${invoiceId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (res.ok) { toast.success(`Marked as ${s.toLowerCase()}`); router.refresh(); }
    else toast.error("Update failed");
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      {status === "DRAFT" && (
        <Button size="sm" variant="outline" onClick={() => updateStatus("SENT")} disabled={loading === "SENT"}>
          {loading === "SENT" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Sent"}
        </Button>
      )}
      {status === "SENT" && (
        <Button size="sm" onClick={() => updateStatus("PAID")} disabled={loading === "PAID"} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          {loading === "PAID" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
    </div>
  );
}
