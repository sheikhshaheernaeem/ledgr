import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileCheck } from "lucide-react";

export default async function W2Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;

  const year = new Date().getFullYear() - 1;
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31T23:59:59`);

  const payrollRuns = await prisma.payrollRun.findMany({
    where: { userId, periodStart: { gte: start }, periodEnd: { lte: end } },
    include: { employees: true },
    orderBy: { periodStart: "desc" },
  });

  const allEmployees = payrollRuns.flatMap(r => r.employees);
  const totalPayroll = allEmployees.reduce((s, e) => s + e.grossPay, 0);
  const contractors = allEmployees.filter(e => e.is1099);
  const totalContractorPay = contractors.reduce((s, e) => s + e.grossPay, 0);

  const employeeMap = new Map<string, { name: string; gross: number; federal: number; state: number; ss: number; medicare: number; is1099: boolean }>();
  for (const e of allEmployees) {
    const existing = employeeMap.get(e.employeeId ?? e.employeeName);
    if (existing) {
      existing.gross += e.grossPay;
      existing.federal += e.federalTax;
      existing.state += e.stateTax;
      existing.ss += e.socialSecurity;
      existing.medicare += e.medicare;
    } else {
      employeeMap.set(e.employeeId ?? e.employeeName, {
        name: e.employeeName,
        gross: e.grossPay,
        federal: e.federalTax,
        state: e.stateTax,
        ss: e.socialSecurity,
        medicare: e.medicare,
        is1099: e.is1099,
      });
    }
  }

  const employees = Array.from(employeeMap.values());

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-emerald-400" /> W-2 / 1099 Summary — {year}
        </h1>
        <p className="text-muted-foreground mt-1">
          Summary of payroll and contractor payments for {year}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Gross Payroll</p>
            <p className="text-2xl font-bold text-foreground mt-1">${totalPayroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {payrollRuns.length} payroll runs</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">1099 Contractors</p>
            <p className="text-2xl font-bold text-foreground mt-1">{contractors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Contractor records</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Contractor Payments</p>
            <p className="text-2xl font-bold text-foreground mt-1">${totalContractorPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">Reportable to IRS</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Employee W-2 / Contractor 1099 Summary</CardTitle>
          <CardDescription>Aggregate totals per employee for tax year {year}</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No payroll data for {year}. Run payroll in the <a href="/payroll" className="text-emerald-400 hover:underline">Payroll</a> section.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Employee</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Gross</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Federal Tax</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">SS</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Medicare</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">{e.name}</td>
                      <td className="py-2 px-2 text-right font-mono">${e.gross.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono">${e.federal.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono">${e.ss.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono">${e.medicare.toFixed(2)}</td>
                      <td className="py-2 px-2 text-center">
                        {e.is1099 ? (
                          <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">1099-NEC</span>
                        ) : (
                          <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">W-2</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
