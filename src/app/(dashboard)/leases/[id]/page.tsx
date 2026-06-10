"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, DollarSign, CreditCard } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

interface AmortRow { period: string; payment: number; interest: number; principal: number; balance: number }
interface Payment { id: string; paymentDate: string; amount: number; principal: number; interest: number; balance: number }
interface Lease { id: string; leaseNumber: string; lessorName: string; assetDescription: string; leaseType: string; commencementDate: string; endDate: string; monthlyPayment: number; incrementalBorrowingRate: number; rightOfUseAsset: number; leaseLiability: number; remainingLiability: number; status: string; payments: Payment[]; amortizationSchedule: AmortRow[] }

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fmt } = useLocale();
  const [lease, setLease] = useState<Lease | null>(null);
  const [schedule, setSchedule] = useState<AmortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [leaseRes, schedRes] = await Promise.all([
        fetch(`/api/leases/${id}`),
        fetch(`/api/leases/${id}/schedule`),
      ]);
      setLease(await leaseRes.json());
      setSchedule(await schedRes.json());
    } catch { toast.error("Failed to load lease"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, [id]);

  async function recordPayment() {
    setRecording(true);
    try {
      const res = await fetch(`/api/leases/${id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentDate: new Date().toISOString().split("T")[0] }) });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded");
      fetchData();
    } catch { toast.error("Failed to record payment"); }
    finally { setRecording(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!lease) return <div className="p-6 text-muted-foreground">Lease not found</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leases"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{lease.assetDescription}</h1>
            <p className="text-muted-foreground">{lease.leaseNumber} · {lease.lessorName} · <Badge variant="outline">{lease.leaseType}</Badge></p>
          </div>
        </div>
        <Button onClick={recordPayment} disabled={recording || lease.status !== "ACTIVE"}>{recording && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<CreditCard className="h-4 w-4 mr-2" />Record Payment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">ROU Asset</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(lease.rightOfUseAsset)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Initial Liability</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(lease.leaseLiability)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Remaining Liability</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{fmt(lease.remainingLiability)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payment</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(lease.monthlyPayment)}</p>
            <p className="text-xs text-muted-foreground">IBR: {(lease.incrementalBorrowingRate * 100).toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Payment History ({lease.payments.length})</CardTitle></CardHeader>
          <CardContent>
            {lease.payments.length === 0 ? <p className="text-center text-muted-foreground py-4">No payments yet</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lease.payments.slice(0, 10).map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{fmt(p.principal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(p.interest)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Amortization Schedule (First 12)</CardTitle></CardHeader>
          <CardContent>
            {schedule.length === 0 ? <p className="text-center text-muted-foreground py-4">Schedule not generated</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Interest</TableHead><TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {schedule.slice(0, 12).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{new Date(row.period).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(row.interest)}</TableCell>
                      <TableCell className="text-right">{fmt(row.principal)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
