import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { AIChatBubble } from "@/components/ai/AIChatBubble";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 border-r border-border flex-col py-6 px-4 shrink-0">
        <Link href="/" className="px-2 mb-6">
          <span className="text-xl font-bold text-emerald-400">Ledgr</span>
        </Link>

        <Sidebar email={session.user.email ?? ""} isAdmin={isAdmin} />

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
            className="w-full justify-start gap-2 text-muted-foreground mt-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border">
          <Link href="/">
            <span className="text-xl font-bold text-emerald-400">Ledgr</span>
          </Link>
          <MobileSidebar />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        {/* Desktop sticky header bar with notification bell */}
        <div className="hidden md:flex items-center justify-end px-6 py-2 border-b border-border sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
          <NotificationBell />
        </div>
        {children}
      </main>
      <AIChatBubble />
    </div>
  );
}
