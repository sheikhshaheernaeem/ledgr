"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import {
  Inbox, Users, BarChart3, Shield, CheckSquare, Calendar,
  LogOut, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  exact?: boolean;
  badge?: number;
}

interface Props {
  children: React.ReactNode;
  userEmail: string;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
  queueCount?: number;
}

export function FirmSidebar({ children, userEmail, isAdmin, signOutAction, queueCount = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const NAV: NavItem[] = [
    { href: "/firm/queue", label: "Queue", icon: Inbox, badge: queueCount > 0 ? queueCount : undefined },
    { href: "/firm", label: "Clients", icon: Users, exact: true },
    { href: "/firm/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/firm/calendar", label: "Calendar", icon: Calendar },
    { href: "/admin/metrics", label: "Metrics", icon: BarChart3, adminOnly: true },
    { href: "/admin", label: "Admin", icon: Shield, adminOnly: true, exact: true },
  ];

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ledgr-firm-sidebar-collapsed") : null;
    if (stored === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ledgr-firm-sidebar-collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMobileOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = useCallback((href: string, exact: boolean | undefined) => {
    if (!pathname) return false;
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }, [pathname]);

  const sidebarWidth = collapsed ? "lg:w-[64px]" : "lg:w-[232px]";
  const contentLeft = collapsed ? "lg:ml-[64px]" : "lg:ml-[232px]";

  const visibleNav = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-md border border-border bg-card/60 hover:bg-card flex items-center justify-center"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/firm/queue" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-black text-[11px] leading-none">L</span>
            </div>
            <span className="font-semibold tracking-tight">ledgr · firm</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-card/40 backdrop-blur-xl border-r border-border/60
          transition-all duration-200 flex flex-col
          ${mobileOpen ? "w-[260px] translate-x-0" : "w-[260px] -translate-x-full"}
          lg:translate-x-0 ${sidebarWidth}
        `}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b border-border/60 shrink-0">
          <Link href="/firm/queue" className={`flex items-center gap-2 overflow-hidden ${collapsed ? "lg:justify-center lg:w-full" : ""}`}>
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
              <span className="text-background font-black text-xs leading-none">L</span>
            </div>
            <div className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>
              <p className="font-semibold tracking-tight leading-tight">ledgr</p>
              <p className="font-mono text-[10px] text-muted-foreground leading-tight">firm_console</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 rounded-md hover:bg-card flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-2 pt-2 hidden lg:block">
            <GlobalSearch />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors
                  ${active
                    ? "bg-emerald-500/12 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"}
                  ${collapsed ? "lg:justify-center lg:px-0" : ""}
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-emerald-400" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : ""}`} />
                <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                    collapsed ? "lg:hidden" : ""
                  } ${active ? "bg-emerald-500/25 text-emerald-300" : "bg-amber-500/15 text-amber-400"}`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* footer */}
        <div className="border-t border-border/60 p-2 space-y-1 shrink-0">
          <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                {(userEmail[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="text-xs text-foreground font-medium truncate">{userEmail}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{isAdmin ? "admin" : "accountant"}</p>
            </div>
          </div>

          <div className={`flex items-center gap-1 ${collapsed ? "lg:flex-col" : ""}`}>
            <div className={collapsed ? "lg:mx-auto" : ""}>
              <ThemeToggle />
            </div>
            <form action={signOutAction} className={collapsed ? "lg:mx-auto" : "ml-auto"}>
              <button
                type="submit"
                title="Sign out"
                className="w-8 h-8 rounded-md text-muted-foreground hover:bg-card hover:text-foreground inline-flex items-center justify-center"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 mt-1 rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : (<><ChevronLeft className="h-3 w-3" /><span>collapse</span></>)}
          </button>
        </div>
      </aside>

      <main className={`min-h-screen transition-all duration-200 ${contentLeft}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
