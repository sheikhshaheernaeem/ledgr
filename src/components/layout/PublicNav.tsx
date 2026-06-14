"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-black text-xs leading-none">L</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">ledgr</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
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

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm h-8">
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
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-card"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-border/60 my-2" />
            <Link href="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-card">Sign in</Link>
            <Link href="/register" onClick={() => setOpen(false)} className="block">
              <div className="bg-emerald-500 text-black font-semibold rounded-md px-3 py-2 text-sm text-center">Client portal</div>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
