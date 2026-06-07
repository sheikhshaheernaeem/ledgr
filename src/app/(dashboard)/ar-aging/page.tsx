import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./PrintButton";
import { getUserLocale } from "@/lib/getUserLocale";

type AgingBucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

interface AgingRow {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  amountPaid: number;
  balance: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

function getBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "Current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

const bucketStyles: Record<AgingBucket, string> = {
  Current: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  "1-30": "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  "31-60": "border-orange-500/30 text-orange-400 bg-orange-500/10",
  "61-90": "border-red-500/30 text-red-400 bg-red-500/10",
  "90+": "border-red-900/40 text-red-300 bg-red-900/20",
};

const bucketCardStyles: Record<AgingBucket, string> = {
  Current: "border-blue-500/20 bg-blue-500/5",
  "1-30": "border-yellow-500/20 bg-yellow-500/5",
  "31-60": "border-orange-500/20 bg-orange-500/5",
  "61-90": "border-red-500/20 bg-red-500/5",
  "90+": "border-red-900/30 bg-red-900/10",
};

const BUCKETS: AgingBucket[] = ["Current", "1-30", "31-60", "61-90", "90+"];

export default async function ARAgingPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const userId = session.user.id as string;

  const asOfParam = params.asOf;
  const asOf = asOfParam ? new Date(asOfParam + "T23:59:59") : new Date();

  const [invoices, loc] = await Promise.all([
    prisma.invoice.findMany({
    where: {
      userId,
      status: { in: ["SENT", "OVERDUE"] },
      type: "INVOICE",
    },
      orderBy: { dueDate: "asc" },
    }),
    getUserLocale(userId),
  ]);
  const fmt = loc.fmt;

  const rows: AgingRow[] = invoices.map((inv) => {
    const balance = inv.total - (inv.amountPaid ?? 0);
    const dueDate = new Date(inv.dueDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOverdue = Math.floor(
      (asOf.getTime() - dueDate.getTime()) / msPerDay
    );
    const bucket = getBucket(daysOverdue);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      issueDate: new Date(inv.issueDate),
      dueDate,
      total: inv.total,
      amountPaid: inv.amountPaid ?? 0,
      balance,
      daysOverdue,
      bucket,
    };
  });

  const bucketTotals = BUCKETS.reduce(
    (acc, b) => {
      acc[b] = rows
        .filter((r) => r.bucket === b)
        .reduce((s, r) => s + r.balance, 0);
      return acc;
    },
    {} as Record<AgingBucket, number>
  );

  const totalOutstanding = rows.reduce((s, r) => s + r.balance, 0);
  const asOfDisplay = loc.fmtDate(asOf);
  const asOfValue =
    asOfParam ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 space-y-6 print:p-4">
      {/* Header */}
      <div className="flex items-start justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Accounts Receivable Aging
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            As of {asOfDisplay}
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          {/* Date picker via GET form */}
          <form method="GET" className="flex items-center gap-2">
            <label
              htmlFor="asOf"
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              As of date:
            </label>
            <input
              type="date"
              id="asOf"
              name="asOf"
              defaultValue={asOfValue}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
            >
              Apply
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5 col-span-2 md:col-span-3 lg:col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-emerald-400">
              {fmt(totalOutstanding)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rows.length} invoice{rows.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {BUCKETS.map((b) => (
          <Card key={b} className={bucketCardStyles[b]}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                {b === "Current" ? "Current" : `${b} days`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold text-foreground">
                {fmt(bucketTotals[b])}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rows.filter((r) => r.bucket === b).length} inv.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No outstanding invoices</p>
            <p className="text-sm mt-1">
              All invoices are collected or none have been sent yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              Outstanding Invoices{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({rows.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead>Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-sm">
                      {row.clientName}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${row.id}`}
                        className="text-emerald-400 hover:underline font-medium text-sm print:text-foreground print:no-underline"
                      >
                        {row.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {loc.fmtDate(row.issueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {loc.fmtDate(row.dueDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {fmt(row.total)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-400">
                      {fmt(row.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {fmt(row.balance)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.daysOverdue > 0 ? (
                        <span className="text-red-400 font-medium">
                          {row.daysOverdue}
                        </span>
                      ) : (
                        <span className="text-blue-400">
                          {Math.abs(row.daysOverdue)} left
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${bucketStyles[row.bucket]}`}
                      >
                        {row.bucket === "Current"
                          ? "Current"
                          : `${row.bucket} days`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bucket summary totals row */}
      {rows.length > 0 && (
        <Card className="border-border bg-card print:shadow-none">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="font-semibold text-foreground">
                Total Outstanding:{" "}
                <span className="text-emerald-400">{fmt(totalOutstanding)}</span>
              </div>
              {BUCKETS.map((b) =>
                bucketTotals[b] > 0 ? (
                  <div key={b} className="text-muted-foreground">
                    {b === "Current" ? "Current" : `${b} days`}:{" "}
                    <span className="text-foreground font-medium">
                      {fmt(bucketTotals[b])}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 text-xs text-muted-foreground border-t border-border pt-4">
        <p>
          Report generated on{" "}
          {loc.fmtDate(new Date())}{" "}
          · Ledgr AR Aging Report
        </p>
      </div>
    </div>
  );
}
