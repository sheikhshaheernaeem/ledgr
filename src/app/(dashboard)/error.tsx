"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Failed to load page</h2>
        <p className="text-muted-foreground text-sm">{error.message || "Something went wrong loading this page."}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard"}>Dashboard</Button>
          <Button size="sm" onClick={reset} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">Retry</Button>
        </div>
      </div>
    </div>
  );
}
