import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "border-emerald-500/30 text-emerald-400",
  UPDATE: "border-blue-500/30 text-blue-400",
  DELETE: "border-red-500/30 text-red-400",
  APPROVE: "border-emerald-500/30 text-emerald-400",
  REJECT: "border-red-500/30 text-red-400",
  EXPORT: "border-purple-500/30 text-purple-400",
  LOGIN: "border-yellow-500/30 text-yellow-400",
};

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const logs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Complete history of all actions taken in your account</p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Activity History ({logs.length})</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 opacity-20" />
              <p>No audit events yet</p>
              <p className="text-xs mt-1">Actions you take will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ACTION_COLORS[log.action] ?? "border-border text-muted-foreground"}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-foreground">{log.entityType}</span>
                      {log.entityId && <span className="text-muted-foreground text-xs ml-1.5 font-mono">{log.entityId.slice(0, 8)}…</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {log.after ? (
                        <span className="truncate block">
                          {Object.entries(JSON.parse(log.after as string))
                            .slice(0, 3)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
