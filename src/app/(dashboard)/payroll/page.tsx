"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Loader2, ChevronDown, ChevronRight, Trash2, UserCheck,
  AlertTriangle, DollarSign,
} from "lucide-react";

interface PayrollEmployee {
  id: string;
  employeeName: string;
  employeeId: string | null;
  payType: string;
  hoursWorked: number | null;
  hourlyRate: number | null;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  otherDeductions: number;
  netPay: number;
  is1099: boolean;
}

interface PayrollRun {
  id: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  status: string;
  notes: string | null;
  employees: PayrollEmployee[];
}

interface EmployeeRow {
  key: string;
  employeeName: string;
  employeeId: string;
  payType: string;
  hoursWorked: string;
  hourlyRate: string;
  grossPay: string;
  federalTax: string;
  stateTax: string;
  otherDeductions: string;
  is1099: boolean;
}

const statusStyle: Record<string, string> = {
  DRAFT: "border-yellow-500/30 text-yellow-400",
  PROCESSED: "border-emerald-500/30 text-emerald-400",
  VOID: "border-zinc-500/30 text-zinc-400",
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcSocialSecurity(gross: number) { return gross * 0.062; }
function calcMedicare(gross: number) { return gross * 0.0145; }

function calcNetPay(emp: EmployeeRow): number {
  const gross = Number(emp.grossPay) || 0;
  const fed = Number(emp.federalTax) || 0;
  const state = Number(emp.stateTax) || 0;
  const ss = calcSocialSecurity(gross);
  const med = calcMedicare(gross);
  const other = Number(emp.otherDeductions) || 0;
  return gross - fed - state - ss - med - other;
}

function newEmployeeRow(): EmployeeRow {
  return {
    key: Math.random().toString(36).slice(2),
    employeeName: "", employeeId: "", payType: "SALARY",
    hoursWorked: "", hourlyRate: "", grossPay: "",
    federalTax: "", stateTax: "", otherDeductions: "", is1099: false,
  };
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // New run dialog
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runForm, setRunForm] = useState({ periodStart: "", periodEnd: "", payDate: "", notes: "" });
  const [employees, setEmployees] = useState<EmployeeRow[]>([newEmployeeRow()]);

  // Void confirm
  const [voidRun, setVoidRun] = useState<PayrollRun | null>(null);
  const [voiding, setVoiding] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/payroll");
    if (res.ok) setRuns(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateEmployee(key: string, field: keyof EmployeeRow, value: string | boolean) {
    setEmployees(prev => prev.map(e => {
      if (e.key !== key) return e;
      const updated = { ...e, [field]: value };
      // Auto-calc gross for hourly
      if (field === "hoursWorked" || field === "hourlyRate") {
        const h = Number(field === "hoursWorked" ? value : e.hoursWorked) || 0;
        const r = Number(field === "hourlyRate" ? value : e.hourlyRate) || 0;
        if (updated.payType === "HOURLY") updated.grossPay = String(h * r);
      }
      return updated;
    }));
  }

  async function handleSaveRun(saveStatus: "DRAFT" | "PROCESSED") {
    if (!runForm.periodStart || !runForm.periodEnd || !runForm.payDate) {
      toast.error("Period start, end, and pay date are required");
      return;
    }
    const validEmployees = employees.filter(e => e.employeeName.trim());
    if (validEmployees.length === 0) {
      toast.error("At least one employee is required");
      return;
    }

    setSaving(true);
    const payload = {
      periodStart: runForm.periodStart,
      periodEnd: runForm.periodEnd,
      payDate: runForm.payDate,
      notes: runForm.notes || null,
      status: saveStatus,
      employees: validEmployees.map(e => {
        const gross = Number(e.grossPay) || 0;
        const fed = Number(e.federalTax) || 0;
        const state = Number(e.stateTax) || 0;
        const ss = calcSocialSecurity(gross);
        const med = calcMedicare(gross);
        const other = Number(e.otherDeductions) || 0;
        return {
          employeeName: e.employeeName,
          employeeId: e.employeeId || null,
          payType: e.payType,
          hoursWorked: e.payType === "HOURLY" ? Number(e.hoursWorked) || null : null,
          hourlyRate: e.payType === "HOURLY" ? Number(e.hourlyRate) || null : null,
          grossPay: gross,
          federalTax: fed,
          stateTax: state,
          socialSecurity: ss,
          medicare: med,
          otherDeductions: other,
          netPay: gross - fed - state - ss - med - other,
          is1099: e.is1099,
        };
      }),
    };

    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.ok) {
      toast.success(`Payroll run saved as ${saveStatus}`);
      setShowNew(false);
      setRunForm({ periodStart: "", periodEnd: "", payDate: "", notes: "" });
      setEmployees([newEmployeeRow()]);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to save payroll run");
    }
  }

  async function handleVoid() {
    if (!voidRun) return;
    setVoiding(true);
    const res = await fetch(`/api/payroll/${voidRun.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID" }),
    });
    setVoiding(false);
    if (res.ok) { toast.success("Payroll run voided"); setVoidRun(null); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed to void"); }
  }

  async function handleDelete(run: PayrollRun) {
    const res = await fetch(`/api/payroll/${run.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Payroll run deleted"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Cannot delete"); }
  }

  async function handleProcess(run: PayrollRun) {
    const res = await fetch(`/api/payroll/${run.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PROCESSED" }),
    });
    if (res.ok) { toast.success("Payroll run processed"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  }

  const thisYear = new Date().getFullYear();
  const totalPaidThisYear = runs
    .filter(r => r.status === "PROCESSED" && new Date(r.payDate).getFullYear() === thisYear)
    .reduce((s, r) => s + r.totalNet, 0);

  // Totals for new run form
  const runTotals = employees.reduce(
    (acc, e) => {
      const gross = Number(e.grossPay) || 0;
      const fed = Number(e.federalTax) || 0;
      const state = Number(e.stateTax) || 0;
      const ss = calcSocialSecurity(gross);
      const med = calcMedicare(gross);
      const other = Number(e.otherDeductions) || 0;
      acc.gross += gross;
      acc.tax += fed + state + ss + med;
      acc.net += gross - fed - state - ss - med - other;
      return acc;
    },
    { gross: 0, tax: 0, net: 0 }
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage payroll runs and employee payments</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-4 w-4" /> New Payroll Run
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Total Paid This Year ({thisYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-400">{fmt(totalPaidThisYear)}</p>
          <p className="text-xs text-muted-foreground mt-1">Net pay across all PROCESSED runs</p>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <UserCheck className="h-8 w-8 opacity-40" />
              <p>No payroll runs yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Run #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const isExpanded = expandedRows.has(run.id);
                  return (
                    <>
                      <TableRow key={run.id}>
                        <TableCell>
                          <button
                            onClick={() => toggleRow(run.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground">{run.runNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(run.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                          {new Date(run.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(run.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{fmt(run.totalGross)}</TableCell>
                        <TableCell className="text-right text-red-400">{fmt(run.totalTax)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fmt(run.totalNet)}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{run.employees.length}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusStyle[run.status]}`}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {run.status === "DRAFT" && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                                  onClick={() => handleProcess(run)}
                                >
                                  Process
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleDelete(run)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              </>
                            )}
                            {run.status === "PROCESSED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => setVoidRun(run)}
                              >
                                Void
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${run.id}-expanded`}>
                          <TableCell colSpan={10} className="p-0 bg-muted/10">
                            <div className="px-8 py-4">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Employees — {run.runNumber}
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Name</TableHead>
                                    <TableHead className="text-xs">Type</TableHead>
                                    <TableHead className="text-xs text-right">Gross</TableHead>
                                    <TableHead className="text-xs text-right">Federal</TableHead>
                                    <TableHead className="text-xs text-right">State</TableHead>
                                    <TableHead className="text-xs text-right">SS (6.2%)</TableHead>
                                    <TableHead className="text-xs text-right">Medicare (1.45%)</TableHead>
                                    <TableHead className="text-xs text-right">Other</TableHead>
                                    <TableHead className="text-xs text-right">Net Pay</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {run.employees.map((emp) => (
                                    <TableRow key={emp.id}>
                                      <TableCell className="text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-foreground">{emp.employeeName}</span>
                                          {emp.is1099 && (
                                            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">1099</Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground">{emp.payType}</TableCell>
                                      <TableCell className="text-sm text-right">{fmt(emp.grossPay)}</TableCell>
                                      <TableCell className="text-sm text-right text-red-400">{fmt(emp.federalTax)}</TableCell>
                                      <TableCell className="text-sm text-right text-red-400">{fmt(emp.stateTax)}</TableCell>
                                      <TableCell className="text-sm text-right text-red-400">{fmt(emp.socialSecurity)}</TableCell>
                                      <TableCell className="text-sm text-right text-red-400">{fmt(emp.medicare)}</TableCell>
                                      <TableCell className="text-sm text-right text-red-400">{fmt(emp.otherDeductions)}</TableCell>
                                      <TableCell className="text-sm text-right text-emerald-400 font-semibold">{fmt(emp.netPay)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Payroll Run Dialog */}
      <Dialog open={showNew} onOpenChange={o => { if (!o) { setShowNew(false); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Period info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Period Start <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={runForm.periodStart}
                  onChange={e => setRunForm(f => ({ ...f, periodStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period End <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={runForm.periodEnd}
                  onChange={e => setRunForm(f => ({ ...f, periodEnd: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pay Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={runForm.payDate}
                  onChange={e => setRunForm(f => ({ ...f, payDate: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Employees */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Employees</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEmployees(prev => [...prev, newEmployeeRow()])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </Button>
              </div>

              <div className="space-y-4">
                {employees.map((emp, idx) => (
                  <div key={emp.key} className="border border-border rounded-lg p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Employee {idx + 1}</p>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emp.is1099}
                            onChange={e => updateEmployee(emp.key, "is1099", e.target.checked)}
                            className="w-3.5 h-3.5"
                          />
                          1099 Contractor
                        </label>
                        {employees.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            onClick={() => setEmployees(prev => prev.filter(e => e.key !== emp.key))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Name <span className="text-red-400">*</span></Label>
                        <Input
                          placeholder="Full name"
                          value={emp.employeeName}
                          onChange={e => updateEmployee(emp.key, "employeeName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Employee ID</Label>
                        <Input
                          placeholder="Optional"
                          value={emp.employeeId}
                          onChange={e => updateEmployee(emp.key, "employeeId", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pay Type</Label>
                        <Select value={emp.payType} onValueChange={v => updateEmployee(emp.key, "payType", v ?? "SALARY")}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALARY">Salary</SelectItem>
                            <SelectItem value="HOURLY">Hourly</SelectItem>
                            <SelectItem value="CONTRACT">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {emp.payType === "HOURLY" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Hours Worked</Label>
                          <Input
                            type="number" min="0" step="0.5" placeholder="0"
                            value={emp.hoursWorked}
                            onChange={e => updateEmployee(emp.key, "hoursWorked", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hourly Rate ($)</Label>
                          <Input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={emp.hourlyRate}
                            onChange={e => updateEmployee(emp.key, "hourlyRate", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Gross Pay ($)</Label>
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={emp.grossPay}
                          onChange={e => updateEmployee(emp.key, "grossPay", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Federal Tax ($)</Label>
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={emp.federalTax}
                          onChange={e => updateEmployee(emp.key, "federalTax", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">State Tax ($)</Label>
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={emp.stateTax}
                          onChange={e => updateEmployee(emp.key, "stateTax", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Soc. Sec. (6.2%)</Label>
                        <Input
                          readOnly
                          className="bg-muted/30 text-muted-foreground"
                          value={calcSocialSecurity(Number(emp.grossPay) || 0).toFixed(2)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Medicare (1.45%)</Label>
                        <Input
                          readOnly
                          className="bg-muted/30 text-muted-foreground"
                          value={calcMedicare(Number(emp.grossPay) || 0).toFixed(2)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Other Deductions ($)</Label>
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={emp.otherDeductions}
                          onChange={e => updateEmployee(emp.key, "otherDeductions", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Net Pay</Label>
                        <div className="h-9 px-3 flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-sm font-semibold text-emerald-400">{fmt(calcNetPay(emp))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Running totals */}
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Gross</p>
                    <p className="text-lg font-bold text-foreground">{fmt(runTotals.gross)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Tax</p>
                    <p className="text-lg font-bold text-red-400">{fmt(runTotals.tax)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Net</p>
                    <p className="text-lg font-bold text-emerald-400">{fmt(runTotals.net)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any notes for this payroll run..."
                value={runForm.notes}
                onChange={e => setRunForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleSaveRun("DRAFT")}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save as Draft
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
              onClick={() => handleSaveRun("PROCESSED")}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Process Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirm Dialog */}
      <Dialog open={!!voidRun} onOpenChange={o => !o && setVoidRun(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" /> Void Payroll Run
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to void <span className="text-foreground font-semibold">{voidRun?.runNumber}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidRun(null)}>Cancel</Button>
            <Button
              className="bg-red-500 hover:bg-red-400 text-foreground font-semibold"
              onClick={handleVoid}
              disabled={voiding}
            >
              {voiding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Void Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
