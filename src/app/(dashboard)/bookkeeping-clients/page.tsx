import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Upload, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";

export default async function BookkeepingClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN" || role === "ACCOUNTANT";
  if (!isAdmin) redirect("/dashboard");

  // Admins see all clients; accountants see managed clients
  let clients: {
    id: string;
    name: string | null;
    email: string;
    companyName: string | null;
    subscriptionStatus: string | null;
    createdAt: Date;
  }[] = [];

  if (role === "ADMIN") {
    clients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, companyName: true, subscriptionStatus: true, createdAt: true },
    });
  } else {
    const managed = await prisma.managedClient.findMany({
      where: { accountantId: userId, isActive: true },
      include: {
        client: {
          select: { id: true, name: true, email: true, companyName: true, subscriptionStatus: true, createdAt: true },
        },
      },
    });
    clients = managed.map(m => m.client);
  }

  // Latest statement per client
  const clientIds = clients.map(c => c.id);
  const latestStatements = await prisma.statement.findMany({
    where: { userId: { in: clientIds } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, status: true, createdAt: true, rowCount: true, filename: true },
  });

  const stmtByClient: Record<string, typeof latestStatements[0]> = {};
  latestStatements.forEach(s => { if (!stmtByClient[s.userId]) stmtByClient[s.userId] = s; });

  // Latest report per client
  const latestReports = await prisma.report.findMany({
    where: { userId: { in: clientIds } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { userId: true, status: true, month: true, year: true, clientApprovedAt: true },
  });
  const reportByClient: Record<string, typeof latestReports[0]> = {};
  latestReports.forEach(r => { if (!reportByClient[r.userId]) reportByClient[r.userId] = r; });

  function getStatus(clientId: string) {
    const stmt = stmtByClient[clientId];
    const report = reportByClient[clientId];
    if (report?.clientApprovedAt) return { label: "Report Approved", color: "border-emerald-500/30 text-emerald-400", icon: CheckCircle2 };
    if (report?.status === "SENT") return { label: "Report Sent", color: "border-blue-500/30 text-blue-400", icon: Clock };
    if (stmt?.status === "CATEGORIZED") return { label: "Ready to Work", color: "border-purple-500/30 text-purple-400", icon: Upload };
    if (stmt?.status === "PROCESSING") return { label: "Processing", color: "border-yellow-500/30 text-yellow-400", icon: Clock };
    if (!stmt) return { label: "No Upload Yet", color: "border-zinc-500/30 text-zinc-400", icon: AlertCircle };
    return { label: "Uploaded", color: "border-zinc-500/30 text-zinc-400", icon: Upload };
  }

  const PLAN_LABEL: Record<string, string> = { STARTER: "$299/mo", GROWTH: "$599/mo", CFO: "$1,499/mo" };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookkeeping Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {clients.length} client{clients.length !== 1 ? "s" : ""} · click any to open their workspace
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm mt-1">
              {role === "ACCOUNTANT"
                ? "No managed clients assigned to you yet."
                : "No clients have registered yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const status = getStatus(client.id);
            const stmt = stmtByClient[client.id];
            const StatusIcon = status.icon;
            const displayName = client.companyName || client.name || client.email;
            const plan = client.subscriptionStatus?.toUpperCase() ?? "STARTER";

            return (
              <Link key={client.id} href={`/firm/${client.id}`}>
                <Card className="border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{displayName}</p>
                        {client.companyName && client.name && (
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 shrink-0 ml-2 transition-colors" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>

                      {stmt && (
                        <p className="text-xs text-muted-foreground">
                          Last upload: {new Date(stmt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {stmt.rowCount} txns
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {PLAN_LABEL[plan] ?? plan}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Since {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
