import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Trash2 } from "lucide-react";
import { DeleteClaimButton } from "./DeleteClaimButton";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  SUBMITTED: "border-blue-500/30 text-blue-400",
  APPROVED: "border-emerald-500/30 text-emerald-400",
  REJECTED: "border-red-500/30 text-red-400",
  PAID: "border-purple-500/30 text-purple-400",
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const claims = await prisma.expenseClaim.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  const draftTotal = claims
    .filter((c) => c.status === "DRAFT")
    .reduce((s, c) => s + c.totalAmount, 0);

  const submittedTotal = claims
    .filter((c) => c.status === "SUBMITTED")
    .reduce((s, c) => s + c.totalAmount, 0);

  const approvedTotal = claims
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + c.totalAmount, 0);

  const paidYtd = claims
    .filter((c) => c.status === "PAID" && c.paidAt && c.paidAt >= yearStart)
    .reduce((s, c) => s + c.totalAmount, 0);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Claims</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {claims.length} claim{claims.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Claim
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{fmt(draftTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {claims.filter((c) => c.status === "DRAFT").length} claim{claims.filter((c) => c.status === "DRAFT").length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">{fmt(submittedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {claims.filter((c) => c.status === "SUBMITTED").length} submitted
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved (To Pay)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{fmt(approvedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {claims.filter((c) => c.status === "APPROVED").length} approved
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-400">{fmt(paidYtd)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {claims.filter((c) => c.status === "PAID" && c.paidAt && c.paidAt >= yearStart).length} paid this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            All Claims{" "}
            <span className="text-muted-foreground font-normal text-sm">({claims.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No expense claims yet</p>
              <Link href="/expenses/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Submit your first claim
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <Link
                        href={`/expenses/${claim.id}`}
                        className="text-emerald-400 hover:underline font-medium"
                      >
                        {claim.claimNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {claim.description}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {claim._count.items}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(claim.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_STYLES[claim.status] ?? ""}`}
                      >
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {claim.submittedAt
                        ? new Date(claim.submittedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/expenses/${claim.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {claim.status === "DRAFT" && (
                          <DeleteClaimButton id={claim.id} />
                        )}
                      </div>
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
