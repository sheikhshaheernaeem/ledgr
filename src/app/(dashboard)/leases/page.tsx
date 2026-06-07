"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Home, ChevronRight } from "lucide-react";

interface Lease {
  id: string;
  leaseNumber: string;
  lessorName: string;
  assetDescription: string;
  leaseType: string;
  commencementDate: string;
  endDate: string;
  monthlyPayment: number;
  rightOfUseAsset: number;
  leaseLiability: number;
  remainingLiability: number;
  status: string;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  TERMINATED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  EXPIRED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaseNumber: "", lessorName: "", assetDescription: "", leaseType: "OPERATING", commencementDate: "", endDate: "", monthlyPayment: "", incrementalBorrowingRate: "0.05", notes: "" });

  async function fetchLeases() {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      setLeases(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLeases(); }, []);

  async function handleCreate() {
    if (!form.leaseNumber || !form.lessorName || !form.commencementDate || !form.endDate || !form.monthlyPayment) { toast.error("Required fields missing"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/leases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Lease created");
      setShowDialog(false);
      fetchLeases();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const totalROU = leases.reduce((s, l) => s + l.rightOfUseAsset, 0);
  const totalLiability = leases.reduce((s, l) => s + l.remainingLiability, 0);
  const monthlyTotal = leases.filter(l => l.status === "ACTIVE").reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lease Accounting (ASC 842)</h1>
          <p className="text-muted-foreground">Track right-of-use assets and lease liabilities</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Lease</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Leases</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{leases.filter(l => l.status === "ACTIVE").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total ROU Assets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalROU)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Liability</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{fmt(totalLiability)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payments</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(monthlyTotal)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" />Lease Contracts</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : leases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No leases yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Lessor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">ROU Asset</TableHead>
                  <TableHead className="text-right">Remaining Liability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.assetDescription}</p>
                      <p className="text-xs text-muted-foreground">{l.leaseNumber}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.lessorName}</TableCell>
                    <TableCell><Badge variant="outline">{l.leaseType}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{fmt(l.monthlyPayment)}</TableCell>
                    <TableCell className="text-right">{fmt(l.rightOfUseAsset)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(l.remainingLiability)}</TableCell>
                    <TableCell><Badge className={statusColors[l.status] || ""}>{l.status}</Badge></TableCell>
                    <TableCell>
                      <Link href={`/leases/${l.id}`}><Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Lease Contract</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Lease # *</Label><Input value={form.leaseNumber} onChange={e => setForm(f => ({ ...f, leaseNumber: e.target.value }))} placeholder="LEASE-001" /></div>
              <div className="space-y-1"><Label>Type</Label><Select value={form.leaseType} onValueChange={v => setForm(f => ({ ...f, leaseType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPERATING">Operating</SelectItem><SelectItem value="FINANCE">Finance</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Lessor Name *</Label><Input value={form.lessorName} onChange={e => setForm(f => ({ ...f, lessorName: e.target.value }))} placeholder="ABC Properties LLC" /></div>
            <div className="space-y-1"><Label>Asset Description *</Label><Input value={form.assetDescription} onChange={e => setForm(f => ({ ...f, assetDescription: e.target.value }))} placeholder="Office space at 123 Main St" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={form.commencementDate} onChange={e => setForm(f => ({ ...f, commencementDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monthly Payment *</Label><Input type="number" value={form.monthlyPayment} onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))} placeholder="5000" /></div>
              <div className="space-y-1"><Label>IBR Rate</Label><Input type="number" step="0.001" value={form.incrementalBorrowingRate} onChange={e => setForm(f => ({ ...f, incrementalBorrowingRate: e.target.value }))} placeholder="0.05" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Lease</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
