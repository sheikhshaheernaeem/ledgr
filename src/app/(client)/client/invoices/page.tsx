import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText, ExternalLink } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusStyle(status: string): string {
  switch (status) {
    case "PAID": return "border-emerald-500/30 text-emerald-400";
    case "OVERDUE": return "border-red-500/30 text-red-400";
    case "SENT": return "border-blue-500/30 text-blue-400";
    case "DRAFT": return "border-border text-muted-foreground";
    default: return "border-border text-muted-foreground";
  }
}

export default async function ClientInvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    orderBy: { issueDate: "desc" },
  });

  const openInvoices = invoices.filter((inv) => ["SENT", "OVERDUE"].includes(inv.status));
  const totalDue = openInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">All invoices issued to your account</p>
      </div>

      {/* Summary */}
      {openInvoices.length > 0 && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-yellow-400">{openInvoices.length} open invoice{openInvoices.length !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground"> — total amount due: </span>
          <span className="font-semibold text-foreground">${fmt(totalDue)}</span>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No invoices yet</p>
              <p className="text-xs mt-1">Invoices will appear here once they are issued.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const balance = inv.total - inv.amountPaid;
                  const canView = ["SENT", "OVERDUE"].includes(inv.status) && inv.publicToken;
                  return (
                    <TableRow key={inv.id} className="border-border">
                      <TableCell className="text-sm font-mono text-foreground">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="text-sm font-medium text-foreground">${fmt(inv.total)}</p>
                          {inv.amountPaid > 0 && inv.status !== "PAID" && (
                            <p className="text-xs text-muted-foreground">${fmt(balance)} remaining</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusStyle(inv.status)}`}>
                          {inv.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canView && (
                          <Link href={`/p/${inv.publicToken}`} target="_blank">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                              View Invoice <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
