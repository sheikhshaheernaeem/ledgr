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
} from "lucide-react";
import { signOut } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/reports", icon: FileText, label: "Reports" },
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

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}

          {isAdmin && (
            <>
              <Separator className="my-3" />
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-emerald-400 hover:text-emerald-300"
                >
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
