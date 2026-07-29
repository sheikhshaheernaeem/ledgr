"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { useMode } from "@/components/providers/ModeProvider";
import { FloatingChat } from "@/components/layout/FloatingChat";
import { ClientNotificationsBell } from "@/components/layout/ClientNotificationsBell";
import type { Family } from "@/config/tiers";
import {
  Sparkles, FileText, BarChart2, MessageSquare, Settings, Inbox,
  LogOut, ChevronLeft, ChevronRight, Menu, X,
  Activity, Receipt, Wallet, Calculator, FolderOpen, Upload,
} from "lucide-react";

interface NavItem { href: string; label: string; icon: typeof Sparkles; exact?: boolean }

const NAV_SECTIONS: { title: string; family: Family | null; items: NavItem[] }[] = [
  {
    title: "AI Accountant",
    family: "ai",
    items: [
      { href: "/ai/client", label: "AI Accountant", icon: Sparkles, exact: true },
      { href: "/ai/client/transactions", label: "Transactions", icon: FileText },
      { href: "/ai/client/reports", label: "Reports", icon: BarChart2 },
    ],
  },
  {
    title: "Book keeping",
    family: "bookkeeping",
    items: [
      { href: "/bookkeeping/client", label: "Overview", icon: Activity, exact: true },
      { href: "/bookkeeping/client/financials", label: "My Books", icon: Wallet },
      { href: "/bookkeeping/client/tax", label: "Tax", icon: Calculator },
      { href: "/bookkeeping/client/invoices", label: "Invoices", icon: Receipt },
      { href: "/bookkeeping/client/documents", label: "Documents", icon: FolderOpen },
      { href: "/bookkeeping/client/upload", label: "Upload", icon: Upload },
    ],
  },
  {
    title: "Account",
    family: null,
    items: [
      { href: "/client/requests", label: "Requests", icon: Inbox },
      { href: "/client/messages", label: "Messages", icon: MessageSquare },
      { href: "/client/settings", label: "Settings", icon: Settings },
    ],
  },
];

const FAMILY_HOME: Record<Family, string> = { ai: "/ai/client", bookkeeping: "/bookkeeping/client" };

interface Props {
  children: React.ReactNode;
  userEmail: string;
  families: Family[];
  signOutAction: () => Promise<void>;
  /** Set by /ai/client and /bookkeeping/client layouts to fix the section — the URL, not the shared mode cookie, decides. */
  activeFamily?: Family;
}

export function ClientSidebar({ children, userEmail, families, signOutAction, activeFamily: fixedFamily }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useMode();

  const hasBoth = families.includes("ai") && families.includes("bookkeeping");
  // Single-product clients always see their own section, regardless of the shared mode cookie.
  const activeFamily: Family = fixedFamily ?? (hasBoth ? mode : (families[0] ?? "ai"));
  const visibleSections = NAV_SECTIONS.filter((s) => s.family === null || s.family === activeFamily);

  // hydrate from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ledgr-sidebar-collapsed") : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "1") setCollapsed(true);
  }, []);

  // persist
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ledgr-sidebar-collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // close mobile drawer on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // ESC closes mobile drawer
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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar (with hamburger) */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-md border border-border bg-card/60 hover:bg-card flex items-center justify-center"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href={FAMILY_HOME[activeFamily]} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-black text-[11px] leading-none">L</span>
            </div>
            <span className="font-semibold tracking-tight">ledgr</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ClientNotificationsBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop sticky, mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-card/40 backdrop-blur-xl border-r border-border/60
          transition-all duration-200 flex flex-col
          ${mobileOpen ? "w-[260px] translate-x-0" : "w-[260px] -translate-x-full"}
          lg:translate-x-0 ${sidebarWidth}
        `}
      >
        {/* brand row */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-border/60 shrink-0">
          <Link href={FAMILY_HOME[activeFamily]} className={`flex items-center gap-2 overflow-hidden ${collapsed ? "lg:justify-center lg:w-full" : ""}`}>
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
              <span className="text-background font-black text-xs leading-none">L</span>
            </div>
            <span className={`font-semibold tracking-tight whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>
              ledgr
            </span>
          </Link>
          {/* mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 rounded-md hover:bg-card flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* mode toggle — shared /client/* pages (messages, settings, …) with no fixed family */}
        {hasBoth && !fixedFamily && (
          <div className={`px-2 pt-2 ${collapsed ? "flex justify-center" : ""}`}>
            <ModeToggle
              compact
              className="w-full justify-center"
              onSelect={(next) => router.push(FAMILY_HOME[next])}
            />
          </div>
        )}

        {/* nav — grouped by section (active product / Account) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {visibleSections.map((section, sIdx) => {
            const isAiSection = section.title === "AI Accountant";
            const isBkSection = section.title === "Book keeping";
            const accentText = isAiSection ? "text-cyan-500 dark:text-cyan-400" : isBkSection ? "text-emerald-500 dark:text-emerald-400" : "";
            const accentBg = isAiSection ? "bg-cyan-500/12" : isBkSection ? "bg-emerald-500/12" : "bg-muted";
            const accentBar = isAiSection ? "bg-cyan-500" : isBkSection ? "bg-emerald-500" : "bg-foreground";
            return (
              <div key={section.title} className="space-y-0.5">
                {!collapsed && (
                  <p className={`px-2.5 mt-${sIdx === 0 ? 0 : 1} mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground`}>
                    <span className={accentText}>·</span> {section.title.toLowerCase().replace(/ /g, "_")}
                  </p>
                )}
                {section.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`
                        group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors
                        ${active
                          ? `${accentBg} text-foreground font-medium`
                          : "text-muted-foreground hover:bg-card hover:text-foreground"}
                        ${collapsed ? "lg:justify-center lg:px-0" : ""}
                      `}
                    >
                      {active && (
                        <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r ${accentBar}`} />
                      )}
                      <item.icon className={`h-4 w-4 shrink-0 ${active ? accentText : ""}`} />
                      <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* footer: user + theme + signout + collapse toggle */}
        <div className="border-t border-border/60 p-2 space-y-1 shrink-0">
          {/* user row */}
          <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-foreground uppercase">
                {(userEmail[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <span className={`text-xs text-muted-foreground truncate ${collapsed ? "lg:hidden" : ""}`}>
              {userEmail}
            </span>
          </div>

          {/* actions row */}
          <div className={`flex items-center gap-1 ${collapsed ? "lg:flex-col" : ""}`}>
            <div className={collapsed ? "lg:mx-auto" : ""}>
              <ThemeToggle />
            </div>
            <form
              action={signOutAction}
              className={collapsed ? "lg:mx-auto" : "ml-auto"}
            >
              <button
                type="submit"
                title="Sign out"
                className="w-8 h-8 rounded-md text-muted-foreground hover:bg-card hover:text-foreground inline-flex items-center justify-center"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 mt-1 rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <>
                <ChevronLeft className="h-3 w-3" />
                <span>collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`min-h-screen transition-all duration-200 ${contentLeft}`}>
        {/* Desktop top-right notifications */}
        <div className="hidden lg:flex absolute top-3 right-4 z-30">
          <ClientNotificationsBell />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* AI assistant — always available */}
      <FloatingChat />
    </div>
  );
}
