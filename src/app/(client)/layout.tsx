import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LogOut, LayoutDashboard, FileText, BarChart2, Upload, List, BarChart3, MessageSquare } from "lucide-react";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navigation */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/client" className="shrink-0">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Ledgr</span>
            <span className="ml-2 text-xs text-muted-foreground font-normal">Your accounting, done.</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/client">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Button>
            </Link>
            <Link href="/client/upload">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
            </Link>
            <Link href="/client/transactions">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <List className="h-3.5 w-3.5" /> Transactions
              </Button>
            </Link>
            <Link href="/client/analytics">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </Button>
            </Link>
            <Link href="/client/reports">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <BarChart2 className="h-3.5 w-3.5" /> Reports
              </Button>
            </Link>
            <Link href="/client/invoices">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5" /> Invoices
              </Button>
            </Link>
            <Link href="/client/messages">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                <MessageSquare className="h-3.5 w-3.5" /> Messages
              </Button>
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[160px]">
              {session.user.email}
            </span>
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          <Link href="/client">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <LayoutDashboard className="h-3 w-3" /> Home
            </Button>
          </Link>
          <Link href="/client/upload">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
              <Upload className="h-3 w-3" /> Upload
            </Button>
          </Link>
          <Link href="/client/transactions">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <List className="h-3 w-3" /> Txns
            </Button>
          </Link>
          <Link href="/client/analytics">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <BarChart3 className="h-3 w-3" /> Analytics
            </Button>
          </Link>
          <Link href="/client/reports">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <BarChart2 className="h-3 w-3" /> Reports
            </Button>
          </Link>
          <Link href="/client/invoices">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <FileText className="h-3 w-3" /> Invoices
            </Button>
          </Link>
          <Link href="/client/messages">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
              <MessageSquare className="h-3 w-3" /> Messages
            </Button>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
