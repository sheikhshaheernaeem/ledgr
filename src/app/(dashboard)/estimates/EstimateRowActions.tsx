"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2 } from "lucide-react";

export default function EstimateRowActions({
  estimateId,
  status,
}: {
  estimateId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(s: string) {
    setLoading(true);
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
    setLoading(false);
  }

  async function convertToInvoice() {
    setLoading(true);
    const res = await fetch(`/api/estimates/${estimateId}/convert`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Converted to invoice");
      router.push(`/invoices/${data.invoiceId}`);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Conversion failed");
    }
    setLoading(false);
  }

  async function deleteEstimate() {
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch(`/api/estimates/${estimateId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Estimate deleted");
      router.refresh();
    } else {
      toast.error("Cannot delete — only DRAFT estimates can be deleted");
    }
    setLoading(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => (window.location.href = `/estimates/${estimateId}`)}
        >
          View
        </DropdownMenuItem>
        {status === "DRAFT" && (
          <DropdownMenuItem onClick={() => updateStatus("SENT")}>
            Mark Sent
          </DropdownMenuItem>
        )}
        {status === "SENT" && (
          <>
            <DropdownMenuItem onClick={() => updateStatus("ACCEPTED")}>
              Mark Accepted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("DECLINED")}>
              Mark Declined
            </DropdownMenuItem>
          </>
        )}
        {status === "ACCEPTED" && (
          <DropdownMenuItem onClick={convertToInvoice}>
            Convert to Invoice
          </DropdownMenuItem>
        )}
        {status === "DRAFT" && (
          <DropdownMenuItem
            onClick={deleteEstimate}
            className="text-red-400 focus:text-red-400"
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
