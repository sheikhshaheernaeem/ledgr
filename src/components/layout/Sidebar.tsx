"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, ArrowLeftRight, FileText, Settings, Building2,
  Receipt, Scale, PiggyBank, GitMerge, TrendingUp, Link2, Shield, ShieldCheck,
  Users, Calculator, Zap, BarChart2, ScanLine, FolderOpen,
  BookOpen, BookMarked, ListChecks, Clock, Package, Lock, Percent,
  ClipboardList, Briefcase, UserCheck, Wallet, FileCheck, Sparkles, CheckSquare,
  FileMinus, Car, CalendarCheck, UserPlus, TrendingDown, BookKey, FileEdit,
  Network, Layers, FolderKanban, Box, GitPullRequest, BookCheck, HomeIcon,
  AlertTriangle, LineChart, PieChart, BarChart3, Send, Brain, Wand2, Users2, Paintbrush,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const coreNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/approvals", icon: CheckSquare, label: "Approvals" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/charts", icon: LineChart, label: "Charts" },
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
  { href: "/vendors", icon: Building2, label: "Vendors" },
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

const enterpriseNav = [
  { href: "/entities", icon: Network, label: "Entities" },
  { href: "/consolidation", icon: Layers, label: "Consolidation" },
  { href: "/departments", icon: Building2, label: "Departments" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/inventory", icon: Box, label: "Inventory" },
  { href: "/approvals/workflows", icon: GitPullRequest, label: "Approval Workflows" },
  { href: "/revenue-recognition", icon: BookCheck, label: "Revenue Recognition" },
  { href: "/leases", icon: HomeIcon, label: "Lease Accounting" },
  { href: "/deferred-tax", icon: Calculator, label: "Deferred Tax" },
  { href: "/vendor-portal", icon: Send, label: "Vendor Portal" },
];

const reportsNav = [
  { href: "/reports/variance", icon: BarChart3, label: "Variance Report" },
  { href: "/reports/ratios", icon: PieChart, label: "Financial Ratios" },
  { href: "/reports/custom", icon: FileText, label: "Custom Reports" },
  { href: "/compliance/sod", icon: Shield, label: "SoD Compliance" },
  { href: "/integrations", icon: Link2, label: "Integrations" },
];

const aiNav = [
  { href: "/ai/anomaly-detection", icon: AlertTriangle, label: "Anomaly Detection" },
  { href: "/ai/scenarios", icon: LineChart, label: "Scenario Modeling" },
  { href: "/ai/board-report", icon: Brain, label: "Board Report" },
  { href: "/ai/cohort-analysis", icon: Users2, label: "Cohort Analysis" },
];

const firmNav = [
  { href: "/firm", icon: Briefcase, label: "My Firm" },
  { href: "/team", icon: UserPlus, label: "Team Members" },
];

const systemNav = [
  { href: "/audit-log", icon: Shield, label: "Audit Log" },
  { href: "/settings/white-label", icon: Paintbrush, label: "White-Label" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
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

export default function Sidebar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {coreNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Finance</p>

        {financeNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Accounting</p>

        {accountingNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">HR & Ops</p>

        {opsNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Enterprise</p>

        {enterpriseNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Advanced Reports</p>

        {reportsNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">AI Insights</p>

        {aiNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Firm</p>

        {firmNav.map(item => <NavItem key={item.href} {...item} />)}

        <Separator className="my-2" />

        {systemNav.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            <Link
              href="/admin"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade CTA */}
      <Link href="/upgrade" className="block mx-1 mb-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/15 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Upgrade to Pro</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">Unlock all features · $29/month</p>
        </div>
      </Link>

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
