"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white border border-border rounded-md px-3 py-1.5 transition-colors print:hidden"
    >
      <Printer className="h-4 w-4" /> Print
    </button>
  );
}
