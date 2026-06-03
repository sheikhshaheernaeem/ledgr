"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || "An unexpected error occurred. Our team has been notified."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>Go Home</Button>
          <Button onClick={reset} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">Try Again</Button>
        </div>
      </div>
    </div>
  );
}
