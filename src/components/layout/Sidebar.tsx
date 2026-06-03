"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, ArrowLeftRight, FileText, Settings, Building2,
  Receipt, Scale, PiggyBank, GitMerge, TrendingUp, Link2, Shield, ShieldCheck,
} from "lucide-react";

const coreNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/reports", icon: FileText, label: "Reports" },
];

const financeNav = [
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/accounts", icon: Building2, label: "Bank Accounts" },
  { href: "/balance-sheet", icon: Scale, label: "Balance Sheet" },
  { href: "/budget", icon: PiggyBank, label: "Budget vs Actual" },
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

      <Separator className="my-4" />
      <div className="px-2 space-y-2">
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
    </>
  );
}
