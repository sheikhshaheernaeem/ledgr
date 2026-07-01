import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FileText } from "lucide-react";
import EstimateRowActions from "./EstimateRowActions";

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  SENT: "border-cyan-500/30 text-cyan-400",
  ACCEPTED: "border-emerald-500/30 text-emerald-400",
  DECLINED: "border-red-500/30 text-red-400",
  CONVERTED: "border-purple-500/30 text-purple-400",
};

export default async function EstimatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const estimates = await prisma.invoice.findMany({
    where: { userId: session.user.id as string, type: "ESTIMATE" },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground mt-1">
            {estimates.filter((e) => e.status === "ACCEPTED").length} accepted,{" "}
            {estimates.filter((e) => e.status === "DRAFT" || e.status === "SENT").length} pending
          </p>
        </div>
        <Link href="/estimates/new">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Estimate
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            All Estimates{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({estimates.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estimates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No estimates yet</p>
              <Link href="/estimates/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Create your first estimate
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell>
                      <Link
                        href={`/estimates/${est.id}`}
                        className="text-emerald-400 hover:underline font-medium"
                      >
                        {est.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{est.clientName}</p>
                      {est.clientEmail && (
                        <p className="text-xs text-muted-foreground">
                          {est.clientEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(est.issueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(est.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {est.total.toLocaleString("en-US", {
                        style: "currency",
                        currency: est.currency ?? "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusStyle[est.status] ?? ""}`}
                      >
                        {est.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EstimateRowActions
                        estimateId={est.id}
                        status={est.status}
                      />
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
