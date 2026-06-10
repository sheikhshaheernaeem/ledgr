import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, FileText, Upload, Plus, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

const PLAN_MRR: Record<string, number> = { STARTER: 299, GROWTH: 599, CFO: 1499 };

export default async function ServiceDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const monthStart = new Date(thisYear, thisMonth - 1, 1);

  const managedClients = await prisma.managedClient.findMany({
    where: { accountantId: userId, isActive: true },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          subscriptionStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const clientIds = managedClients.map((mc) => mc.client.id);

  const [reportsThisMonth, statementsThisMonth, pendingApprovals] = await Promise.all([
    prisma.report.findMany({
      where: { userId: { in: clientIds }, month: thisMonth, year: thisYear },
      select: { id: true, userId: true, status: true, totalIncome: true, totalExpenses: true, netProfit: true, clientApprovedAt: true, sentAt: true },
    }),
    prisma.statement.findMany({
      where: { userId: { in: clientIds }, createdAt: { gte: monthStart } },
      select: { id: true, userId: true, status: true, filename: true, rowCount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({
      where: { userId: { in: clientIds }, status: "SENT", clientApprovedAt: null },
    }),
  ]);

  const reportByClient = Object.fromEntries(reportsThisMonth.map((r) => [r.userId, r]));
  const statementsByClient = statementsThisMonth.reduce<Record<string, typeof statementsThisMonth>>(
    (acc, s) => { (acc[s.userId] = acc[s.userId] ?? []).push(s); return acc; },
    {}
  );

  const mrr = managedClients.reduce((sum, mc) => {
    const plan = mc.client.subscriptionStatus ?? "STARTER";
    return sum + (PLAN_MRR[plan.toUpperCase()] ?? 299);
  }, 0);

  const reportsSent = reportsThisMonth.filter((r) => r.status === "SENT" || r.status === "APPROVED").length;
  const statementsUploaded = new Set(statementsThisMonth.map((s) => s.userId)).size;

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function clientStatus(clientId: string) {
    const report = reportByClient[clientId];
    const stmts = statementsByClient[clientId] ?? [];
    if (report?.clientApprovedAt) return { label: "Approved", color: "border-emerald-500/30 text-emerald-400" };
    if (report?.status === "SENT") return { label: "Report Sent", color: "border-blue-500/30 text-blue-400" };
    if (report?.status === "DRAFT") return { label: "In Review", color: "border-yellow-500/30 text-yellow-400" };
    if (stmts.some((s) => s.status === "CATEGORIZED")) return { label: "Ready to Report", color: "border-purple-500/30 text-purple-400" };
    if (stmts.length > 0) return { label: "Processing", color: "border-yellow-500/30 text-yellow-400" };
    return { label: "Awaiting Statement", color: "border-zinc-500/30 text-zinc-400" };
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Operations</h1>
          <p className="text-muted-foreground">Manage your bookkeeping clients · {new Date(thisYear, thisMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/firm">
          <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add Client</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4" />Active Clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{managedClients.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-4 w-4" />MRR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(mrr)}</p><p className="text-xs text-muted-foreground mt-0.5">{fmt(mrr * 12)} ARR</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" />Reports Sent</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{reportsSent}<span className="text-sm text-muted-foreground font-normal"> / {managedClients.length}</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4" />Pending Approvals</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendingApprovals}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Client Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {managedClients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No clients yet</p>
              <p className="text-sm mt-1">Add your first client via the Firm tab.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Statements</TableHead>
                  <TableHead>This Month P&L</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {managedClients.map(({ client }) => {
                  const status = clientStatus(client.id);
                  const report = reportByClient[client.id];
                  const stmts = statementsByClient[client.id] ?? [];
                  return (
                    <TableRow key={client.id} className="border-border">
                      <TableCell>
                        <p className="font-medium text-sm">{client.companyName || client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {stmts.length === 0 ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" />None uploaded</span>
                        ) : (
                          <span className="text-xs text-foreground flex items-center gap-1"><Upload className="h-3 w-3 text-emerald-500" />{stmts.length} file{stmts.length > 1 ? "s" : ""} · {stmts.reduce((s, x) => s + x.rowCount, 0)} txns</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report ? (
                          <div>
                            <span className="text-xs text-emerald-600">+{fmt(report.totalIncome)}</span>
                            <span className="text-xs text-muted-foreground mx-1">/</span>
                            <span className="text-xs text-red-400">-{fmt(report.totalExpenses)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report?.clientApprovedAt ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approved</span>
                        ) : report ? (
                          <span className="text-xs text-yellow-400 flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/firm/${client.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">Open Workspace</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {statementsThisMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {statementsThisMonth.slice(0, 10).map((s) => {
                const client = managedClients.find((mc) => mc.client.id === s.userId)?.client;
                return (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{client?.companyName || client?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{s.filename} · {s.rowCount} txns · {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className={
                      s.status === "CATEGORIZED" ? "border-emerald-500/30 text-emerald-400" :
                      s.status === "PROCESSING" ? "border-yellow-500/30 text-yellow-400" :
                      "border-red-500/30 text-red-400"
                    }>{s.status.toLowerCase()}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
