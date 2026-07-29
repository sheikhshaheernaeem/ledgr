"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useMode } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";

const STATIC_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { mode } = useMode();
  const homeHref = `/${mode}`;
  const links = [{ href: homeHref, label: "Home" }, ...STATIC_LINKS];

  // /ai/* and /bookkeeping/* are dedicated single-service sites — no toggle,
  // no link, no mention of the other service at all. The switcher only
  // makes sense on the neutral shared pages (splash, services, about, contact).
  const fixedFamily: Family | null = pathname?.startsWith("/ai") ? "ai" : pathname?.startsWith("/bookkeeping") ? "bookkeeping" : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href={homeHref} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-black text-xs leading-none">L</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">ledgr</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== homeHref && pathname?.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors ${active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {!fixedFamily && <ModeToggle />}
          <ThemeToggle />
          <Link href={`/${mode}/login`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              Sign in
            </Button>
          </Link>
          <Link href={`/${mode}/register`}>
            <Button size="sm" className={`text-black font-semibold text-sm h-8 ${mode === "ai" ? "bg-cyan-500 hover:bg-cyan-400" : "bg-emerald-500 hover:bg-emerald-400"}`}>
              Client portal
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden w-9 h-9 rounded-md border border-border bg-card/60 flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="px-4 py-3 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-card"
              >
                {l.label}
              </Link>
            ))}
            {!fixedFamily && (
              <>
                <div className="border-t border-border/60 my-2" />
                <div className="px-3 py-1">
                  <ModeToggle className="w-full justify-center" />
                </div>
              </>
            )}
            <Link href={`/${mode}/login`} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-card">Sign in</Link>
            <Link href={`/${mode}/register`} onClick={() => setOpen(false)} className="block">
              <div className={`text-black font-semibold rounded-md px-3 py-2 text-sm text-center ${mode === "ai" ? "bg-cyan-500" : "bg-emerald-500"}`}>Client portal</div>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
