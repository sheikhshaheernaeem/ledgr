"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, X, Loader2 } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  loading: boolean;
}

export function BulkActionBar({
  count,
  onApprove,
  onReject,
  onClear,
  loading,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-3 flex items-center gap-4"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.3)" }}
    >
      <span className="text-sm font-medium text-foreground">
        {count} selected
      </span>
      <div className="flex gap-2 ml-auto">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          disabled={loading}
          className="gap-1.5"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={loading}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
