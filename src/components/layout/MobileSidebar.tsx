"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, ArrowLeftRight, FileText, Settings, Building2, Receipt, Scale, PiggyBank, GitMerge, TrendingUp, Link2, Shield, LogOut, Users, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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

function MobileNavItem({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link href={href} onClick={onNavigate}>
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

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <div className="flex flex-col h-full py-6 px-4">
          <Link href="/" className="px-2 mb-6" onClick={close}>
            <span className="text-xl font-bold text-emerald-400">Ledgr</span>
          </Link>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {coreNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">
              Finance
            </p>

            {financeNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />

            {systemNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}
          </nav>

          <Separator className="my-4" />
          <Link href="/api/auth/signout" onClick={close}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
