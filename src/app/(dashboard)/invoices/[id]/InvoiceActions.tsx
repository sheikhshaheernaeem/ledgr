"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, Loader2, FileText } from "lucide-react";

export default function InvoiceActions({ invoiceId, status, type }: { invoiceId: string; status: string; type: string }) {
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

  async function convertToInvoice() {
    setLoading("convert");
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "INVOICE" }),
    });
    if (res.ok) { toast.success("Converted to invoice"); router.refresh(); }
    else toast.error("Conversion failed");
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      {type === "QUOTE" && (
        <Button size="sm" variant="outline" onClick={convertToInvoice} disabled={loading === "convert"} className="gap-1.5">
          {loading === "convert" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          Convert to Invoice
        </Button>
      )}
      {status === "DRAFT" && type !== "QUOTE" && (
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
