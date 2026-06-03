"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  { keys: ["⌘", "K"], label: "Search" },
  { keys: ["⌘", "/"], label: "Keyboard shortcuts" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "T"], label: "Go to Transactions" },
  { keys: ["G", "I"], label: "Go to Invoices" },
  { keys: ["G", "R"], label: "Go to Reports" },
  { keys: ["N", "I"], label: "New Invoice" },
];

const gSequence: Record<string, string> = {
  d: "/dashboard",
  t: "/transactions",
  i: "/invoices",
  r: "/reports",
};

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pendingGRef = useRef(false);
  const pendingNRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearPending = () => {
      pendingGRef.current = false;
      pendingNRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable;

      // Cmd+/ or Ctrl+/ — open shortcuts dialog
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
        clearPending();
        return;
      }

      if (isInput) return;

      // ? key — open shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
        clearPending();
        return;
      }

      // G sequence
      if (pendingGRef.current) {
        const dest = gSequence[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        clearPending();
        return;
      }

      // N sequence
      if (pendingNRef.current) {
        if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          router.push("/invoices/new");
        }
        clearPending();
        return;
      }

      // Start G sequence
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        pendingGRef.current = true;
        timerRef.current = setTimeout(clearPending, 1500);
        return;
      }

      // Start N sequence
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        pendingNRef.current = true;
        timerRef.current = setTimeout(clearPending, 1500);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1 py-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.label}
              className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-muted/30"
            >
              <span className="text-sm text-muted-foreground">{shortcut.label}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
          Sequential shortcuts (G D, N I) have a 1.5 s window between keys.
        </p>
      </DialogContent>
    </Dialog>
  );
}
