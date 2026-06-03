import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  Receipt,
  Scale,
  PiggyBank,
  GitMerge,
  TrendingUp,
  Link2,
  Shield,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import { NavItem } from "@/components/layout/NavItem";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border flex flex-col py-6 px-4 shrink-0">
        <Link href="/" className="px-2 mb-6">
          <span className="text-xl font-bold text-emerald-400">Ledgr</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {coreNav.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}

          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-1">Finance</p>

          {financeNav.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}

          <Separator className="my-2" />

          {systemNav.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}

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
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
