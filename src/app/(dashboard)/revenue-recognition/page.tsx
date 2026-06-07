"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, FileText, ChevronRight } from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  totalValue: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: string;
  recognitionMethod: string;
  client: { name: string } | null;
  schedules: Array<{ scheduledAmount: number; recognizedAmount: number; deferredAmount: number; posted: boolean }>;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function RevenueRecognitionPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ contractNumber: "", name: "", totalValue: "", currency: "USD", startDate: "", endDate: "", recognitionMethod: "STRAIGHT_LINE", clientId: "" });

  async function fetchContracts() {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue-contracts");
      setContracts(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchContracts(); }, []);

  async function handleCreate() {
    if (!form.contractNumber || !form.name || !form.totalValue || !form.startDate) { toast.error("Required fields missing"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/revenue-contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Contract created");
      setShowDialog(false);
      fetchContracts();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const totalDeferred = contracts.flatMap(c => c.schedules).reduce((s, sch) => s + sch.deferredAmount, 0);
  const totalRecognized = contracts.flatMap(c => c.schedules).reduce((s, sch) => s + sch.recognizedAmount, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Recognition (ASC 606)</h1>
          <p className="text-muted-foreground">Track deferred revenue and recognition schedules</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Contract</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{contracts.filter(c => c.status === "ACTIVE").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Recognized</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(totalRecognized)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deferred Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{fmt(totalDeferred)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Revenue Contracts</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No revenue contracts yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Recognition Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const recognized = c.schedules.reduce((s, sch) => s + sch.recognizedAmount, 0);
                  const progress = c.totalValue > 0 ? (recognized / c.totalValue) * 100 : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.contractNumber}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.client?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{c.recognitionMethod.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{fmt(c.totalValue)}</TableCell>
                      <TableCell className="min-w-32">
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">{fmt(recognized)} of {fmt(c.totalValue)}</p>
                      </TableCell>
                      <TableCell><Badge className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <Link href={`/revenue-recognition/${c.id}`}><Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button></Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Revenue Contract</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Contract # *</Label><Input value={form.contractNumber} onChange={e => setForm(f => ({ ...f, contractNumber: e.target.value }))} placeholder="RC-2024-001" /></div>
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SaaS Subscription" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Total Value *</Label><Input type="number" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))} placeholder="120000" /></div>
              <div className="space-y-1"><Label>Recognition Method</Label><Select value={form.recognitionMethod} onValueChange={(v: string) => setForm(f => ({ ...f, recognitionMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="STRAIGHT_LINE">Straight-Line</SelectItem><SelectItem value="MILESTONE">Milestone</SelectItem><SelectItem value="PERCENTAGE_COMPLETE">% Complete</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
