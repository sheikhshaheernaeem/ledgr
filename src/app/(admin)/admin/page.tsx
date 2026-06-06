import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  const [clients, pendingReports, recentTransactions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      include: {
        _count: { select: { transactions: true, reports: true } },
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { status: { in: ["DRAFT", "REVIEWED"] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const stats = [
    {
      label: "Total Clients",
      value: clients.length,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending Reports",
      value: pendingReports.length,
      icon: FileText,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Unreviewed Transactions",
      value: recentTransactions.length,
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Ready to Send",
      value: pendingReports.filter((r) => r.status === "REVIEWED").length,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Review AI output and manage client reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reports */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Reports Awaiting Review</CardTitle>
            <CardDescription>
              Review and approve before sending to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All caught up! No pending reports.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-emerald-500/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {report.user.name ?? report.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.year, report.month - 1).toLocaleString(
                          "default",
                          { month: "long", year: "numeric" }
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          report.status === "REVIEWED"
                            ? "border-blue-500/30 text-blue-400"
                            : "border-yellow-500/30 text-yellow-400"
                        }`}
                      >
                        {report.status.toLowerCase()}
                      </Badge>
                      <Link href={`/admin/review/${report.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients table */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
            <CardDescription>All active client accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No clients yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Reports</TableHead>
                    <TableHead>Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {client.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client._count.transactions}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client._count.reports}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-500/30 text-emerald-400"
                        >
                          {client.subscription?.plan.toLowerCase() ?? "free"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
