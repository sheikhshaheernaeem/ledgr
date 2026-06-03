"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, ArrowLeftRight, FileText, Settings, Building2,
  Receipt, Scale, PiggyBank, GitMerge, TrendingUp, Link2, Shield, ShieldCheck,
  Users, Calculator, Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const coreNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/reports", icon: FileText, label: "Reports" },
];

const financeNav = [
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/accounts", icon: Building2, label: "Bank Accounts" },
  { href: "/balance-sheet", icon: Scale, label: "Balance Sheet" },
  { href: "/budget", icon: PiggyBank, label: "Budget vs Actual" },
  { href: "/tax-summary", icon: Calculator, label: "Tax Summary" },
  { href: "/reconciliation", icon: GitMerge, label: "Reconciliation" },
  { href: "/forecast", icon: TrendingUp, label: "Cash Flow Forecast" },
  { href: "/bank-sync", icon: Link2, label: "Bank Sync" },
];

const systemNav = [
  { href: "/audit-log", icon: Shield, label: "Audit Log" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={`w-full justify-start gap-3 transition-colors ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Button>
    </Link>
  );
}

export default function Sidebar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {coreNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Finance</p>

        {financeNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />

        {systemNav.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start gap-3 text-emerald-400 hover:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          </>
        )}
      </nav>

      {/* Subscribe CTA */}
      <a href="https://buymeacoffee.com/alsmartech" target="_blank" rel="noreferrer" className="block mx-1 mb-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/15 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-400">Subscribe to Ledgr</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">Unlock all features · Support development</p>
        </div>
      </a>

      <Separator className="my-3" />
      <div className="px-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">Search</p>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>
    </>
  );
}
