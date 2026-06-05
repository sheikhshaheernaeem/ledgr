import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Users, DollarSign, FileText, Download } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const THRESHOLD_1099 = 600;

export default async function Contractor1099Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id as string;

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);

  const periodStart = new Date(year, 0, 1);
  const periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  // Fetch all PROCESSED payroll runs for the year
  const payrollRuns = await prisma.payrollRun.findMany({
    where: {
      userId,
      status: "PROCESSED",
      payDate: { gte: periodStart, lte: periodEnd },
    },
    include: {
      employees: {
        where: { is1099: true },
        select: {
          id: true,
          employeeName: true,
          employeeId: true,
          grossPay: true,
        },
      },
    },
  });

  // Group by employeeName, summing grossPay
  const contractorMap = new Map<
    string,
    { employeeName: string; employeeId: string | null; totalPaid: number; runCount: number }
  >();

  for (const run of payrollRuns) {
    for (const emp of run.employees) {
      const existing = contractorMap.get(emp.employeeName);
      if (existing) {
        existing.totalPaid += emp.grossPay;
        existing.runCount += 1;
      } else {
        contractorMap.set(emp.employeeName, {
          employeeName: emp.employeeName,
          employeeId: emp.employeeId,
          totalPaid: emp.grossPay,
          runCount: 1,
        });
      }
    }
  }

  const contractors = Array.from(contractorMap.values()).sort(
    (a, b) => b.totalPaid - a.totalPaid
  );

  const totalPaid = contractors.reduce((s, c) => s + c.totalPaid, 0);
  const requiring1099 = contractors.filter((c) => c.totalPaid >= THRESHOLD_1099);
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Build CSV data URL
  const csvRows = [
    ["Contractor Name", "Employee ID", "Total Paid", "Requires 1099"],
    ...contractors.map((c) => [
      c.employeeName,
      c.employeeId ?? "",
      c.totalPaid.toFixed(2),
      c.totalPaid >= THRESHOLD_1099 ? "Yes" : "No",
    ]),
  ];
  const csvContent = csvRows.map((r) => r.join(",")).join("\n");
  const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">1099 Contractors</h1>
          <p className="text-muted-foreground mt-1">
            Track payments to independent contractors for 1099 filing (US).
            Contractors paid $600+ require a 1099.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Year selector */}
          <form method="GET" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={year}
              className="bg-card border border-border text-sm text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-3 py-1.5 rounded-md transition-colors"
            >
              Apply
            </button>
          </form>
          {contractors.length > 0 && (
            <a
              href={csvDataUri}
              download={`1099-contractors-${year}.csv`}
              className="flex items-center gap-1.5 text-sm font-medium border border-border rounded-md px-3 py-1.5 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
            >
              <Download className="h-4 w-4" /> Export CSV
            </a>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Contractors</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-white">{contractors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">across all payroll runs in {year}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-white">${fmt(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-1">gross payments in {year}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Require 1099</p>
              <FileText className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{requiring1099.length}</p>
            <p className="text-xs text-muted-foreground mt-1">paid $600+ this year</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Note Banner */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Tax advisory note:</strong> Please consult your tax advisor.
            Ledgr provides 1099 payment tracking only and does not file tax forms.
            IRS Form 1099-NEC is required for contractors paid $600 or more in a calendar year.
          </p>
        </CardContent>
      </Card>

      {/* Contractors Table */}
      {contractors.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No 1099 contractors found</p>
            <p className="text-sm mt-1">
              No processed payroll runs with 1099 contractors found for {year}.
            </p>
            <p className="text-xs mt-3">
              To track a contractor, mark their record as &ldquo;1099&rdquo; when adding them to a payroll run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contractor Payments — {year}</CardTitle>
            <CardDescription>
              All 1099 contractors from processed payroll runs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Contractor Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-center">Payroll Runs</TableHead>
                  <TableHead className="text-center">Requires 1099</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractors.map((c) => {
                  const needs1099 = c.totalPaid >= THRESHOLD_1099;
                  return (
                    <TableRow key={c.employeeName} className="border-border">
                      <TableCell className="font-medium text-white">{c.employeeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.employeeId ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${fmt(c.totalPaid)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {c.runCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {needs1099 ? (
                          <CheckCircle2 className="h-4 w-4 text-yellow-400 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            needs1099
                              ? "border-yellow-500/30 text-yellow-400"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {needs1099 ? "1099 Required" : "Below Threshold"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Separator />
            <div className="p-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {requiring1099.length} of {contractors.length} contractors require a 1099
              </div>
              <div className="font-semibold text-white">
                Total: ${fmt(totalPaid)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
