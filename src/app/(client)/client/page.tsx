import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Upload, ArrowRight, Sparkles, MessageSquare, FolderOpen, HelpCircle } from "lucide-react";
import { ActionInbox } from "@/components/client/ActionInbox";
import { StatusStrip } from "@/components/client/StatusStrip";
import { FinBertWidget } from "@/components/client/FinBertWidget";

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = session.user.id;

  // First-time user → onboarding wizard
  const [statementCount, currentUser] = await Promise.all([
    prisma.statement.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { companyName: true, name: true } }),
  ]);
  if (statementCount === 0 && !currentUser?.companyName) {
    redirect("/client/onboarding");
  }

  const firstName = (currentUser?.name ?? session.user.email ?? "").split(" ")[0]?.split("@")[0] ?? "there";
  const greeting = getGreeting();

  return (
    <div className="space-y-7 max-w-3xl mx-auto">
      {/* Greeting — minimal */}
      <div>
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
      </div>

      {/* The inbox — what needs you */}
      <ActionInbox userId={userId} />

      {/* Live status — small, secondary */}
      <StatusStrip userId={userId} />

      {/* Proactive: upload statement (always available, calm style) */}
      <Link
        href="/client/upload"
        className="group block rounded-xl border border-dashed border-border/80 hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-colors p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-base font-medium text-foreground">Send a bank statement</p>
            <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
              CSV from your bank · we&apos;ll categorize it in minutes
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400 shrink-0" />
        </div>
      </Link>

      {/* FinBERT tone analysis — soft, optional */}
      <FinBertWidget />

      {/* Small calm shortcut row — utilities */}
      <nav className="grid grid-cols-3 gap-3">
        <Shortcut href="/client/messages" icon={MessageSquare} label="Message" />
        <Shortcut href="/client/documents" icon={FolderOpen} label="Documents" />
        <Shortcut href="/client/help" icon={HelpCircle} label="Help" />
      </nav>

      {/* Hint about AI — soft */}
      <div className="text-center text-xs text-muted-foreground font-mono pt-4">
        <Sparkles className="h-3 w-3 inline mr-1" />
        ask your AI accountant anything — bottom right corner
      </div>
    </div>
  );
}

function Shortcut({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card/30 hover:bg-card/60 hover:border-emerald-500/30 transition-colors py-3"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400" />
      <span className="text-xs text-muted-foreground group-hover:text-foreground">{label}</span>
    </Link>
  );
}

function getGreeting(): string {
  // eslint-disable-next-line react-hooks/purity
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
