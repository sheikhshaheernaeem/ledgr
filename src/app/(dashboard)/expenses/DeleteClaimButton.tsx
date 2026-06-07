"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteClaimButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this expense claim?")) return;
    setLoading(true);
    const res = await fetch(`/api/expense-claims/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) { toast.success("Claim deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDelete}
      disabled={loading}
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
