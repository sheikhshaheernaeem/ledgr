"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, ArrowLeftRight, FileText, Settings, Building2, Receipt, Scale, PiggyBank, GitMerge, TrendingUp, Link2, Shield, LogOut, Users, Calculator, Zap, BarChart2, ScanLine, FolderOpen, BookOpen, BookMarked, ListChecks, Clock, Package, Lock, Percent, ClipboardList, Briefcase, UserCheck, Wallet, FileCheck, Sparkles, CheckSquare, FileMinus, Car, CalendarCheck, UserPlus, TrendingDown, BookKey, FileEdit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const coreNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/approvals", icon: CheckSquare, label: "Approvals" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/ai-assistant", icon: Sparkles, label: "AI Assistant" },
];

const financeNav = [
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/estimates", icon: FileEdit, label: "Estimates" },
  { href: "/credit-notes", icon: FileMinus, label: "Credit Notes" },
  { href: "/receipts", icon: ScanLine, label: "Receipts" },
  { href: "/documents", icon: FolderOpen, label: "Documents" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/accounts", icon: Building2, label: "Bank Accounts" },
  { href: "/balance-sheet", icon: Scale, label: "Balance Sheet" },
  { href: "/profit-loss", icon: TrendingUp, label: "Profit & Loss" },
  { href: "/ar-aging", icon: TrendingDown, label: "AR Aging" },
  { href: "/ap-aging", icon: TrendingDown, label: "AP Aging" },
  { href: "/budget", icon: PiggyBank, label: "Budget vs Actual" },
  { href: "/expenses", icon: Wallet, label: "Expense Claims" },
  { href: "/mileage", icon: Car, label: "Mileage" },
  { href: "/tax-summary", icon: Calculator, label: "Tax Summary" },
  { href: "/reconciliation", icon: GitMerge, label: "Reconciliation" },
  { href: "/forecast", icon: TrendingUp, label: "Cash Flow Forecast" },
  { href: "/bank-sync", icon: Link2, label: "Bank Sync" },
];

const accountingNav = [
  { href: "/chart-of-accounts", icon: BookOpen, label: "Chart of Accounts" },
  { href: "/opening-balances", icon: BookKey, label: "Opening Balances" },
  { href: "/journal-entries", icon: BookMarked, label: "Journal Entries" },
  { href: "/general-ledger", icon: ListChecks, label: "General Ledger" },
  { href: "/trial-balance", icon: Scale, label: "Trial Balance" },
  { href: "/bills", icon: Receipt, label: "Bills (A/P)" },
  { href: "/cash-flow-statement", icon: Wallet, label: "Cash Flow Statement" },
  { href: "/vat-returns", icon: Percent, label: "VAT Returns" },
  { href: "/tax-calculator", icon: Calculator, label: "Tax Calculator" },
  { href: "/period-locks", icon: Lock, label: "Period Locks" },
  { href: "/workpapers", icon: ClipboardList, label: "Workpapers" },
  { href: "/contractor-1099", icon: FileCheck, label: "1099 Contractors" },
];

const opsNav = [
  { href: "/time-tracking", icon: Clock, label: "Time Tracking" },
  { href: "/payroll", icon: UserCheck, label: "Payroll" },
  { href: "/fixed-assets", icon: Package, label: "Fixed Assets" },
  { href: "/tax-calendar", icon: CalendarCheck, label: "Tax Calendar" },
];

const firmNav = [
  { href: "/firm", icon: Briefcase, label: "My Firm" },
  { href: "/team", icon: UserPlus, label: "Team Members" },
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
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
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
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
        }
      />
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <div className="flex flex-col h-full py-6 px-4">
          <Link href="/" className="px-2 mb-6" onClick={close}>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Ledgr</span>
          </Link>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {coreNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Finance</p>

            {financeNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Accounting</p>

            {accountingNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">HR & Ops</p>

            {opsNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Firm</p>

            {firmNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}

            <Separator className="my-2" />

            {systemNav.map((item) => (
              <MobileNavItem key={item.href} {...item} onNavigate={close} />
            ))}
          </nav>

          <a href="https://buymeacoffee.com/alsmartech" target="_blank" rel="noreferrer" onClick={close} className="block mb-2">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/15 transition-colors">
              <div className="flex items-center gap-2 mb-0.5">
                <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Subscribe to Ledgr</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Unlock all features · Support development</p>
            </div>
          </a>

          <Separator className="my-3" />
          <Link
            href="/api/auth/signout"
            onClick={close}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
