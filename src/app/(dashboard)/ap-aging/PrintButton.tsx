"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors print:hidden"
      type="button"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
