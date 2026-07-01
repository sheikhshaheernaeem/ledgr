"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, Inbox, FileText, Brain, LogOut, Menu, X, Sparkles, FileX,
  CreditCard, Activity,
} from "lucide-react";

interface NavItem { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/billing", label: "Billing & Tiers", icon: CreditCard },
  { href: "/admin/usage", label: "Usage", icon: Activity },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/reports", label: "Reports archive", icon: FileText },
  { href: "/admin/ai-insights", label: "AI insights", icon: Brain },
  { href: "/admin/failures", label: "Failures", icon: FileX },
];

interface Props {
  children: React.ReactNode;
  userEmail: string;
  signOutAction: () => Promise<void>;
}

export function AdminSidebar({ children, userEmail, signOutAction }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border/60 bg-card/30 flex-col">
        <div className="px-5 py-5 border-b border-border/40">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-cyan-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">L</span>
            </div>
            <div>
              <p className="font-semibold text-foreground leading-tight">Ledgr</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500 dark:text-cyan-400">admin_console</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 font-medium"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/40 px-3 py-3 space-y-2">
          <p className="px-3 text-[11px] font-mono text-muted-foreground truncate">{userEmail}</p>
          <form action={signOutAction}>
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-card hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
          <p className="px-3 pt-2 text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> ai_native
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-xl flex items-center justify-between px-4 h-12">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">L</span>
          </div>
          <span className="font-semibold text-foreground text-sm">Ledgr admin</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 rounded-md border border-border bg-card/60 flex items-center justify-center" aria-label="Toggle menu">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-background/95 backdrop-blur-xl pt-12">
          <nav className="px-4 py-4 space-y-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-md text-sm text-foreground hover:bg-card">
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
            <form action={signOutAction} className="border-t border-border/40 mt-3 pt-3">
              <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-3 rounded-md text-sm text-muted-foreground hover:bg-card hover:text-foreground">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 md:p-8 p-4 pt-16 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
