import React, { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle } from "lucide-react";
import PrintButton from "./PrintButton";
import { getUserLocale } from "@/lib/getUserLocale";

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  debit: number;
  credit: number;
  net: number;
}

interface TrialBalanceData {
  startDate: string;
  endDate: string;
  grouped: Record<string, TrialBalanceRow[]>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expenses",
};

const TYPE_BADGE: Record<string, string> = {
  ASSET: "border-blue-500/30 text-blue-400",
  LIABILITY: "border-orange-500/30 text-orange-400",
  EQUITY: "border-purple-500/30 text-purple-400",
  REVENUE: "border-emerald-500/30 text-emerald-400",
  EXPENSE: "border-red-500/30 text-red-400",
};

function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const startDate = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const endDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

async function fetchTrialBalance(startDate: string, endDate: string): Promise<TrialBalanceData> {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/trial-balance?startDate=${startDate}&endDate=${endDate}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load trial balance");
  return res.json();
}

async function TrialBalanceContent({
  startDate,
  endDate,
  fmtFn,
}: {
  startDate: string;
  endDate: string;
  fmtFn: (n: number) => string;
}) {
  let data: TrialBalanceData;
  try {
    data = await fetchTrialBalance(startDate, endDate);
  } catch {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Failed to load trial balance. Please try again.</p>
      </div>
    );
  }

  const typeOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  return (
    <>
      {/* Balanced indicator */}
      <div className="flex items-center gap-3">
        {data.balanced ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Trial balance is balanced
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
            <XCircle className="h-5 w-5" />
            Trial balance is NOT balanced — difference of{" "}
            {fmtFn(Math.abs(data.totalDebit - data.totalCredit))}
          </div>
        )}
        <span className="text-muted-foreground text-xs">
          {data.startDate} to {data.endDate}
        </span>
      </div>

      {Object.keys(data.grouped).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No journal entry activity in this period.</p>
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeOrder
                  .filter((t) => data.grouped[t])
                  .map((type) => {
                    const rows = data.grouped[type];
                    const sectionDebit = rows.reduce((s, r) => s + r.debit, 0);
                    const sectionCredit = rows.reduce((s, r) => s + r.credit, 0);
                    return (
                      <React.Fragment key={type}>
                        {/* Section header */}
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={4} className="py-2">
                            <Badge variant="outline" className={`text-xs ${TYPE_BADGE[type] ?? ""}`}>
                              {TYPE_LABELS[type] ?? type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {/* Account rows */}
                        {rows.map((row) => (
                          <TableRow key={row.accountId}>
                            <TableCell className="font-mono text-sm text-muted-foreground">{row.code}</TableCell>
                            <TableCell className="text-sm">{row.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {row.debit > 0 ? (
                                <span className="text-red-400">{fmtFn(row.debit)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {row.credit > 0 ? (
                                <span className="text-emerald-400">{fmtFn(row.credit)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Section subtotal */}
                        <TableRow className="bg-muted/10 border-t border-border/50">
                          <TableCell className="text-xs text-muted-foreground italic" colSpan={2}>
                            {TYPE_LABELS[type] ?? type} subtotal
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium text-red-400">
                            {sectionDebit > 0 ? fmtFn(sectionDebit) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium text-emerald-400">
                            {sectionCredit > 0 ? fmtFn(sectionCredit) : "—"}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}

                {/* Grand total */}
                <TableRow className="border-t-2 border-border bg-muted/20 font-semibold">
                  <TableCell colSpan={2} className="text-sm">
                    <div className="flex items-center gap-2">
                      Grand Total
                      {data.balanced ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-400">
                    {fmtFn(data.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">
                    {fmtFn(data.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const defaults = getDefaultDates();
  const startDate = sp.startDate ?? defaults.startDate;
  const endDate = sp.endDate ?? defaults.endDate;
  const loc = await getUserLocale(session.user.id as string);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trial Balance</h1>
          <p className="text-muted-foreground mt-1">Debit and credit totals for all accounts</p>
        </div>
        <PrintButton />
      </div>

      {/* Date range form — GET method for server component */}
      <form method="GET" className="print:hidden">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="startDate">
                  Start Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={startDate}
                  className="flex h-9 w-40 rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="endDate">
                  End Date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={endDate}
                  className="flex h-9 w-40 rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
              >
                Apply
              </button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Separator className="print:hidden" />

      {/* Print header (only shows when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-bold">Trial Balance</h2>
        <p className="text-sm text-muted-foreground">{startDate} to {endDate}</p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-emerald-500 rounded-full border-t-transparent" />
          </div>
        }
      >
        <TrialBalanceContent startDate={startDate} endDate={endDate} fmtFn={loc.fmt} />
      </Suspense>
    </div>
  );
}
