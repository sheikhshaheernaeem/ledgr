import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, FileText, AlertCircle, CheckCircle2, Shield, UserCheck, Clock, Upload,
} from "lucide-react";
import { AdminRoleButton } from "./AdminRoleButton";
import { AdminDeleteButton } from "./AdminDeleteButton";
import { AdminVerifyButton } from "./AdminVerifyButton";
import { CreateAccountButton } from "./CreateAccountButton";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  const [allUsers, pendingReports, pendingTransactions, recentStatements] = await Promise.all([
    prisma.user.findMany({
      include: {
        _count: { select: { transactions: true, reports: true, invoices: true } },
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { status: { in: ["DRAFT", "REVIEWED"] } },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.statement.findMany({
      include: { user: { select: { name: true, email: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const clients = allUsers.filter((u) => u.role === "CLIENT");
  const admins = allUsers.filter((u) => u.role === "ADMIN");
  const accountants = allUsers.filter((u) => u.role === "ACCOUNTANT");

  const stats = [
    { label: "Total Users", value: allUsers.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Clients", value: clients.length, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pending Reports", value: pendingReports.length, icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Pending Transactions", value: pendingTransactions.length, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  const currentUserId = session.user.id as string;

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <Link href="/firm/queue" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
        ← back to firm console
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Full platform overview — all users, reports, and transactions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/metrics">
            <Button variant="outline" className="gap-1.5">
              <FileText className="h-4 w-4" />
              MRR &amp; Growth Metrics
            </Button>
          </Link>
          <Link href="/admin/yc-application">
            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
              <FileText className="h-4 w-4" />
              YC Application Draft
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Users Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Users ({allUsers.length})</CardTitle>
              <CardDescription>Every registered account — admins, accountants, and clients</CardDescription>
            </div>
            <CreateAccountButton />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Txns</TableHead>
                <TableHead className="text-center">Reports</TableHead>
                <TableHead className="text-center">Invoices</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((user) => {
                const roleColor =
                  user.role === "ADMIN"
                    ? "border-red-500/30 text-red-400"
                    : user.role === "ACCOUNTANT"
                    ? "border-blue-500/30 text-blue-400"
                    : "border-emerald-500/30 text-emerald-400";
                const roleIcon =
                  user.role === "ADMIN" ? (
                    <Shield className="h-3 w-3 mr-1" />
                  ) : user.role === "ACCOUNTANT" ? (
                    <UserCheck className="h-3 w-3 mr-1" />
                  ) : null;
                const isCurrentUser = user.id === currentUserId;

                return (
                  <TableRow key={user.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.name ?? "—"}
                          {isCurrentUser && (
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{user.id.slice(0, 8)}…</p>
                        {!user.emailVerified && (
                          <span className="text-[10px] text-yellow-500">● email unverified</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs flex items-center w-fit ${roleColor}`}>
                        {roleIcon}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                        {user.subscription?.plan?.toLowerCase() ?? "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {user._count.transactions}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {user._count.reports}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {user._count.invoices}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === "CLIENT" && (
                          <Link href={`/firm/${user.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              View
                            </Button>
                          </Link>
                        )}
                        {!isCurrentUser && (
                          <AdminRoleButton userId={user.id} currentRole={user.role} />
                        )}
                        {!isCurrentUser && !user.emailVerified && (
                          <AdminVerifyButton userId={user.id} />
                        )}
                        {!isCurrentUser && (
                          <AdminDeleteButton userId={user.id} userName={user.name ?? user.email ?? user.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Admin Accounts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <Shield className="h-4 w-4" /> Admin Accounts ({admins.length})
            </CardTitle>
            <CardDescription>Full platform access</CardDescription>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No admin accounts found.</p>
            ) : (
              <div className="space-y-3">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-background">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name ?? a.email}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{a.id.slice(0, 8)}…</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {a._count.transactions} txns · {a._count.reports} reports
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Joined {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accountant Accounts */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-400">
              <UserCheck className="h-4 w-4" /> Accountants ({accountants.length})
            </CardTitle>
            <CardDescription>Can review and approve reports</CardDescription>
          </CardHeader>
          <CardContent>
            {accountants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No accountant accounts. Promote a user to ACCOUNTANT role.</p>
            ) : (
              <div className="space-y-3">
                {accountants.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-background">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name ?? a.email}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                    <AdminRoleButton userId={a.id} currentRole={a.role} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" /> Client Uploads ({recentStatements.length})
              </CardTitle>
              <CardDescription>All CSV bank statement uploads across every client account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentStatements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No uploads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-center">Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStatements.map((s) => {
                  const statusColor =
                    s.status === "CATEGORIZED" ? "border-emerald-500/30 text-emerald-400" :
                    s.status === "PROCESSING"  ? "border-yellow-500/30 text-yellow-400" :
                    s.status === "ERROR"       ? "border-red-500/30 text-red-400" :
                    "border-border text-muted-foreground";
                  return (
                    <TableRow key={s.id} className="border-border">
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {s.user.companyName || s.user.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.user.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground font-mono">{s.filename}</p>
                        {s.periodStart && s.periodEnd && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {s.rowCount}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusColor}`}>
                          {s.status.toLowerCase()}
                        </Badge>
                        {s.status === "ERROR" && s.errorMsg && (
                          <p className="text-[10px] text-red-400 mt-0.5 max-w-[180px] truncate">{s.errorMsg}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reports + Pending Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Reports Awaiting Review</CardTitle>
            <CardDescription>Review and approve before sending to clients</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                All caught up!
              </p>
            ) : (
              <div className="space-y-2">
                {pendingReports.slice(0, 10).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-emerald-500/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {report.user.name ?? report.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.year, report.month - 1).toLocaleString("default", {
                          month: "long", year: "numeric",
                        })}
                        <Badge
                          variant="outline"
                          className={`ml-2 text-[10px] ${
                            report.user.role === "ADMIN"
                              ? "border-red-500/30 text-red-400"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {report.user.role}
                        </Badge>
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
                        <Button variant="outline" size="sm" className="text-xs">Review</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Pending Transactions</CardTitle>
            <CardDescription>Awaiting approval across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                No pending transactions.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingTransactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.user.name ?? tx.user.email} · {tx.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
                {pendingTransactions.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingTransactions.length - 10} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
